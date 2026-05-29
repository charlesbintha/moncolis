import {
  Injectable, BadRequestException, NotFoundException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { BookingStatus, PaymentMethod, PaymentStatus } from '../common/prisma/prisma-client';
import axios from 'axios';

/**
 * PaymentsService - Logique d'escrow
 *
 * Flux:
 * 1. Expéditeur initie le paiement → PENDING
 * 2. Fonds bloqués (HELD) après acceptation par le transporteur
 * 3. Fonds libérés (RELEASED) après confirmation livraison (CONFIRMED)
 * 4. Remboursement (REFUNDED) si annulation avant remise ou décision admin
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // ============================================================
  // INITIER UN PAIEMENT (après acceptation du transporteur)
  // ============================================================

  async initiatePayment(senderId: string, dto: InitiatePaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { payment: true },
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.senderId !== senderId) throw new ForbiddenException('Accès non autorisé');
    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException('La réservation doit être acceptée avant le paiement');
    }
    if (booking.payment) {
      throw new BadRequestException('Un paiement existe déjà pour cette réservation');
    }

    // Créer l'entrée de paiement
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        amount: booking.totalAmount,
        method: dto.method,
        status: PaymentStatus.PENDING,
      },
    });

    // Déclencher l'API de paiement correspondante
    let providerResponse: any;
    try {
      if (dto.method === PaymentMethod.CARD) {
        providerResponse = await this.initiateStripePayment(booking.totalAmount, dto.bookingId);
      } else {
        providerResponse = await this.initiatePayDunyaPayment(
          booking.totalAmount,
          dto.method,
          dto.phoneNumber,
          dto.bookingId,
        );
      }

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerRef: providerResponse.token || providerResponse.paymentIntent,
          providerData: providerResponse,
        },
      });
    } catch (error) {
      this.logger.error(`Erreur initiation paiement: ${error.message}`);
      throw new BadRequestException(`Erreur lors de l'initiation du paiement: ${error.message}`);
    }

    return { payment, providerData: providerResponse };
  }

  // ============================================================
  // WEBHOOK PayDunya - Confirmation paiement
  // ============================================================

  async handlePayDunyaWebhook(payload: any) {
    const { token, status, custom_data } = payload;
    const bookingId = custom_data?.bookingId;

    if (!bookingId) {
      this.logger.warn('Webhook PayDunya: bookingId manquant');
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { bookingId, providerRef: token },
    });

    if (!payment) {
      this.logger.warn(`Webhook PayDunya: paiement introuvable pour booking ${bookingId}`);
      return;
    }

    if (status === 'completed') {
      await this.holdPayment(payment.id);
    } else if (status === 'cancelled' || status === 'failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
      });
    }
  }

  // ============================================================
  // BLOQUER LES FONDS (HOLD - Escrow)
  // ============================================================

  async holdPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Paiement introuvable');

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.HELD, heldAt: new Date() },
    });

    this.logger.log(`Fonds bloqués (escrow): ${payment.amount} FCFA - Paiement ${paymentId}`);
  }

  // ============================================================
  // LIBÉRER LES FONDS (RELEASE) - Après confirmation livraison
  // ============================================================

  @OnEvent('booking.confirmed')
  async releasePaymentOnConfirmation(booking: any) {
    await this.releasePayment(booking.id);
  }

  async releasePayment(bookingId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { bookingId } });

    if (!payment) {
      this.logger.warn(`Aucun paiement pour la réservation ${bookingId}`);
      return;
    }

    if (payment.status !== PaymentStatus.HELD) {
      this.logger.warn(`Paiement ${payment.id} non en HELD, libération ignorée`);
      return;
    }

    // CRITIQUE: Ne jamais libérer sans booking CONFIRMED
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.status !== BookingStatus.CONFIRMED) {
      this.logger.error(`SÉCURITÉ: Tentative de libération sans statut CONFIRMED - booking ${bookingId}`);
      throw new BadRequestException('Libération des fonds impossible: livraison non confirmée');
    }

    try {
      // Virement vers le transporteur via l'API de paiement
      await this.disburseFundsToCarrier(booking.carrierId, payment.amount - payment.amount * 0.12, bookingId);

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.RELEASED, releasedAt: new Date() },
      });

      this.logger.log(`Fonds libérés: ${booking.carrierAmount} FCFA → transporteur ${booking.carrierId}`);
    } catch (error) {
      this.logger.error(`Erreur libération fonds: ${error.message}`);
      throw new BadRequestException('Erreur lors de la libération des fonds');
    }
  }

  // ============================================================
  // REMBOURSEMENT
  // ============================================================

  @OnEvent('booking.cancelled')
  async refundOnCancellation(booking: any) {
    const payment = await this.prisma.payment.findUnique({ where: { bookingId: booking.id } });
    if (!payment || payment.status !== PaymentStatus.HELD) return;

    // Remboursement si le colis n'a pas encore été remis
    if ([BookingStatus.PENDING, BookingStatus.ACCEPTED].includes(booking.status)) {
      await this.refundPayment(booking.id, 'Annulation de la réservation');
    }
  }

  async refundPayment(bookingId: string, reason: string, amount?: number) {
    const payment = await this.prisma.payment.findUnique({ where: { bookingId } });
    if (!payment) throw new NotFoundException('Paiement introuvable');

    if (payment.status !== PaymentStatus.HELD) {
      throw new BadRequestException('Seuls les paiements en HELD peuvent être remboursés');
    }

    const refundAmount = amount || payment.amount;

    try {
      await this.processRefund(payment.providerRef || '', refundAmount, payment.method);

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
      });

      this.logger.log(`Remboursement: ${refundAmount} FCFA - Booking ${bookingId} - Raison: ${reason}`);
    } catch (error) {
      this.logger.error(`Erreur remboursement: ${error.message}`);
      throw new BadRequestException('Erreur lors du remboursement');
    }
  }

  // ============================================================
  // HISTORIQUE TRANSACTIONS
  // ============================================================

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const payments = await this.prisma.payment.findMany({
      where: {
        booking: { OR: [{ senderId: userId }, { carrierId: userId }] },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true, status: true,
            trip: { select: { originCity: true, destinationCity: true } },
            sender: { select: { fullName: true } },
            carrier: { select: { fullName: true } },
          },
        },
      },
    });

    return payments;
  }

  // ============================================================
  // INTÉGRATIONS PAIEMENT (Mock en développement)
  // ============================================================

  private async initiatePayDunyaPayment(
    amount: number,
    method: PaymentMethod,
    phone: string,
    bookingId: string,
  ): Promise<any> {
    const mode = this.configService.get('PAYDUNYA_MODE', 'test');

    if (mode === 'test') {
      // Mock en développement
      this.logger.debug(`[MOCK PayDunya] ${method} - ${amount} FCFA vers ${phone}`);
      return {
        token: `mock_token_${Date.now()}`,
        status: 'pending',
        description: `Paiement ColiSN - Réservation ${bookingId}`,
      };
    }

    const masterKey = this.configService.get('PAYDUNYA_MASTER_KEY');
    const privateKey = this.configService.get('PAYDUNYA_PRIVATE_KEY');
    const token = this.configService.get('PAYDUNYA_TOKEN');

    const payload = {
      invoice: {
        total_amount: amount,
        description: `ColiSN - Réservation ${bookingId}`,
      },
      store: { name: 'ColiSN', tagline: 'Covoiturage de colis au Sénégal' },
      custom_data: { bookingId },
      actions: {
        callback_url: `${this.configService.get('FRONTEND_URL')}/payments/callback`,
        return_url: `${this.configService.get('FRONTEND_URL')}/bookings/${bookingId}`,
        cancel_url: `${this.configService.get('FRONTEND_URL')}/bookings/${bookingId}`,
      },
    };

    const response = await axios.post(
      'https://app.paydunya.com/api/v1/checkout-invoice/create',
      payload,
      {
        headers: {
          'PAYDUNYA-MASTER-KEY': masterKey,
          'PAYDUNYA-PRIVATE-KEY': privateKey,
          'PAYDUNYA-TOKEN': token,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  private async initiateStripePayment(amount: number, bookingId: string): Promise<any> {
    const stripe = require('stripe')(this.configService.get('STRIPE_SECRET_KEY'));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // FCFA (pas de centimes pour XOF)
      currency: 'xof',
      metadata: { bookingId },
      description: `ColiSN - Réservation ${bookingId}`,
    });

    return { paymentIntent: paymentIntent.id, clientSecret: paymentIntent.client_secret };
  }

  private async disburseFundsToCarrier(carrierId: string, amount: number, bookingId: string): Promise<void> {
    const mode = this.configService.get('PAYDUNYA_MODE', 'test');
    if (mode === 'test') {
      this.logger.debug(`[MOCK] Virement ${amount} FCFA → transporteur ${carrierId}`);
      return;
    }
    // TODO: Implémenter le virement réel via PayDunya payout API
  }

  private async processRefund(providerRef: string, amount: number, method: PaymentMethod): Promise<void> {
    const mode = this.configService.get('PAYDUNYA_MODE', 'test');
    if (mode === 'test') {
      this.logger.debug(`[MOCK] Remboursement ${amount} FCFA - Ref: ${providerRef}`);
      return;
    }
    // TODO: Implémenter le remboursement réel
  }
}
