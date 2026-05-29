import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CreateBookingDto, ConfirmDeliveryDto } from './dto/create-booking.dto';
import { BookingStatus, ParcelStatus, TripStatus } from '../common/prisma/prisma-client';
import { buildPaginationArgs, buildPaginationMeta } from '../common/dto/pagination.dto';
import { customAlphabet } from 'nanoid';

// Alphabet facile à dicter oralement (sans I, O, 0, 1 pour éviter confusions)
const generateDeliveryCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private readonly COMMISSION_RATE = 0.12; // 12%
  private readonly ACCEPT_DEADLINE_HOURS = 2;

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ============================================================
  // CRÉER UNE RÉSERVATION
  // ============================================================

  async create(senderId: string, dto: CreateBookingDto) {
    const [trip, parcelRequest] = await Promise.all([
      this.prisma.trip.findUnique({
        where: { id: dto.tripId },
        include: { carrier: { select: { id: true, fullName: true } } },
      }),
      this.prisma.parcelRequest.findUnique({ where: { id: dto.parcelRequestId } }),
    ]);

    if (!trip) throw new NotFoundException('Trajet introuvable');
    if (!parcelRequest) throw new NotFoundException('Demande de colis introuvable');

    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException('Ce trajet n\'est plus disponible');
    }
    if (parcelRequest.status !== ParcelStatus.OPEN) {
      throw new BadRequestException('Cette demande de colis n\'est plus disponible');
    }
    if (parcelRequest.senderId !== senderId) {
      throw new ForbiddenException('Vous ne pouvez réserver que vos propres demandes de colis');
    }
    if (trip.carrierId === senderId) {
      throw new BadRequestException('Vous ne pouvez pas réserver votre propre trajet');
    }

    // Vérifier la capacité disponible
    const remainingKg = trip.availableKg - trip.bookedKg;
    if (parcelRequest.weightKg > remainingKg) {
      throw new BadRequestException(
        `Capacité insuffisante. Disponible: ${remainingKg}kg, Votre colis: ${parcelRequest.weightKg}kg`,
      );
    }

    // Vérifier qu'il n'y a pas déjà une réservation active
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        parcelRequestId: dto.parcelRequestId,
        status: { notIn: [BookingStatus.REFUSED, BookingStatus.CANCELLED] },
      },
    });
    if (existingBooking) {
      throw new BadRequestException('Une réservation active existe déjà pour ce colis');
    }

    // Calculer les montants
    const totalAmount = Math.round(parcelRequest.weightKg * trip.pricePerKg);
    const commission = Math.round(totalAmount * this.COMMISSION_RATE);
    const carrierAmount = totalAmount - commission;
    const deliveryCode = generateDeliveryCode();
    const acceptDeadline = new Date(Date.now() + this.ACCEPT_DEADLINE_HOURS * 60 * 60 * 1000);

    const booking = await this.prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          tripId: dto.tripId,
          parcelRequestId: dto.parcelRequestId,
          senderId,
          carrierId: trip.carrierId,
          weightKg: parcelRequest.weightKg,
          totalAmount,
          commission,
          carrierAmount,
          deliveryCode,
          acceptDeadline,
        },
        include: {
          trip: { select: { originCity: true, destinationCity: true, departureDate: true } },
          parcelRequest: { select: { weightKg: true, description: true } },
          sender: { select: { id: true, fullName: true, phone: true } },
          carrier: { select: { id: true, fullName: true, phone: true } },
        },
      });

      // Marquer la demande comme matchée
      await tx.parcelRequest.update({
        where: { id: dto.parcelRequestId },
        data: { status: ParcelStatus.MATCHED },
      });

      return newBooking;
    });

    this.eventEmitter.emit('booking.created', booking);
    this.logger.log(`Réservation créée: ${booking.id} - Montant: ${totalAmount} FCFA`);

    return booking;
  }

  // ============================================================
  // ACCEPTER / REFUSER (transporteur)
  // ============================================================

  async accept(bookingId: string, carrierId: string) {
    const booking = await this.getBookingWithCheck(bookingId, carrierId, 'carrier');

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`Impossible d'accepter : statut actuel = ${booking.status}`);
    }

    if (booking.acceptDeadline < new Date()) {
      throw new BadRequestException('Le délai d\'acceptation (2h) est dépassé. La réservation a été annulée.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.ACCEPTED, acceptedAt: new Date() },
      });

      // Réduire la capacité disponible du trajet
      await tx.trip.update({
        where: { id: booking.tripId },
        data: { bookedKg: { increment: booking.weightKg } },
      });

      return upd;
    });

    this.eventEmitter.emit('booking.accepted', { booking: updated, senderId: booking.senderId });

    return updated;
  }

  async refuse(bookingId: string, carrierId: string, reason?: string) {
    const booking = await this.getBookingWithCheck(bookingId, carrierId, 'carrier');

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(`Impossible de refuser : statut actuel = ${booking.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.REFUSED, refusedAt: new Date(), cancelReason: reason },
      });

      // Remettre la demande à OPEN
      await tx.parcelRequest.update({
        where: { id: booking.parcelRequestId },
        data: { status: ParcelStatus.OPEN },
      });

      return upd;
    });

    this.eventEmitter.emit('booking.refused', { booking: updated, senderId: booking.senderId });
    return updated;
  }

  // ============================================================
  // MISE À JOUR STATUTS
  // ============================================================

  async markParcelHanded(bookingId: string, carrierId: string, photo?: Express.Multer.File) {
    const booking = await this.getBookingWithCheck(bookingId, carrierId, 'carrier');

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException('Le transporteur doit avoir accepté la réservation d\'abord.');
    }

    if (!photo) throw new BadRequestException('Une photo du colis est obligatoire avant la remise.');

    const photoResult = await this.cloudinary.uploadImage(photo, 'parcels', `${bookingId}_parcel`);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.PARCEL_HANDED,
        parcelHandedAt: new Date(),
        parcelPhotoUrl: photoResult.secure_url,
      },
    });

    this.eventEmitter.emit('booking.parcel_handed', updated);
    return updated;
  }

  async markInTransit(bookingId: string, carrierId: string) {
    const booking = await this.getBookingWithCheck(bookingId, carrierId, 'carrier');
    if (booking.status !== BookingStatus.PARCEL_HANDED) {
      throw new BadRequestException('Le colis doit être remis d\'abord (PARCEL_HANDED).');
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.IN_TRANSIT, inTransitAt: new Date() },
    });
    this.eventEmitter.emit('booking.in_transit', updated);
    return updated;
  }

  async markDelivered(bookingId: string, carrierId: string) {
    const booking = await this.getBookingWithCheck(bookingId, carrierId, 'carrier');
    if (booking.status !== BookingStatus.IN_TRANSIT) {
      throw new BadRequestException('Le colis doit être en transit d\'abord.');
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.DELIVERED, deliveredAt: new Date() },
    });
    this.eventEmitter.emit('booking.delivered', updated);
    return updated;
  }

  // ============================================================
  // CONFIRMATION LIVRAISON (par l'expéditeur via code OTP)
  // ============================================================

  async confirmDelivery(bookingId: string, senderId: string, dto: ConfirmDeliveryDto) {
    const booking = await this.getBookingWithCheck(bookingId, senderId, 'sender');

    if (booking.status !== BookingStatus.DELIVERED) {
      throw new BadRequestException('La livraison n\'a pas encore été marquée par le transporteur.');
    }

    if (booking.deliveryCode !== dto.deliveryCode.toUpperCase()) {
      throw new BadRequestException('Code de livraison incorrect.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED, confirmedAt: new Date() },
      });

      // Mettre à jour les statistiques utilisateurs
      await Promise.all([
        tx.user.update({ where: { id: booking.senderId }, data: { totalParcels: { increment: 1 } } }),
        tx.user.update({ where: { id: booking.carrierId }, data: { totalTrips: { increment: 1 } } }),
        tx.parcelRequest.update({ where: { id: booking.parcelRequestId }, data: { status: ParcelStatus.BOOKED } }),
      ]);

      return upd;
    });

    // Déclencher la libération du paiement
    this.eventEmitter.emit('booking.confirmed', updated);

    return updated;
  }

  // ============================================================
  // ANNULATION
  // ============================================================

  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Réservation introuvable');

    const isParticipant = booking.senderId === userId || booking.carrierId === userId;
    if (!isParticipant) throw new ForbiddenException('Accès non autorisé');

    const cancellableStatuses: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.ACCEPTED];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException(`Impossible d'annuler une réservation en statut: ${booking.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason },
      });

      // Libérer la capacité du trajet si déjà accepté
      if (booking.status === BookingStatus.ACCEPTED) {
        await tx.trip.update({
          where: { id: booking.tripId },
          data: { bookedKg: { decrement: booking.weightKg } },
        });
      }

      // Remettre la demande à OPEN
      await tx.parcelRequest.update({
        where: { id: booking.parcelRequestId },
        data: { status: ParcelStatus.OPEN },
      });

      return upd;
    });

    // Déclencher le remboursement si paiement existant
    this.eventEmitter.emit('booking.cancelled', updated);
    return updated;
  }

  // ============================================================
  // LECTURE
  // ============================================================

  async findMyBookings(userId: string, role: 'sender' | 'carrier', page: number = 1, limit: number = 20) {
    const where = role === 'sender' ? { senderId: userId } : { carrierId: userId };

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        include: {
          trip: { select: { originCity: true, destinationCity: true, departureDate: true } },
          parcelRequest: { select: { weightKg: true, description: true, photoUrls: true } },
          payment: { select: { status: true, method: true } },
          sender: { select: { id: true, fullName: true, avatarUrl: true } },
          carrier: { select: { id: true, fullName: true, avatarUrl: true, rating: true } },
        },
      }),
    ]);

    return { data: bookings, pagination: buildPaginationMeta(total, page, limit) };
  }

  async findOne(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: true,
        parcelRequest: true,
        payment: true,
        review: true,
        dispute: true,
        sender: { select: { id: true, fullName: true, phone: true, avatarUrl: true } },
        carrier: { select: { id: true, fullName: true, phone: true, avatarUrl: true, rating: true } },
      },
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.senderId !== userId && booking.carrierId !== userId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Masquer le code de livraison sauf pour l'expéditeur
    if (booking.senderId !== userId) {
      (booking as any).deliveryCode = '******';
    }

    return booking;
  }

  // ============================================================
  // TÂCHE PLANIFIÉE: Annulation automatique après 2h
  // ============================================================

  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoExpirePendingBookings() {
    const expired = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        acceptDeadline: { lt: new Date() },
      },
    });

    for (const booking of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: 'Délai d\'acceptation expiré (2h)',
          },
        });
        await tx.parcelRequest.update({
          where: { id: booking.parcelRequestId },
          data: { status: ParcelStatus.OPEN },
        });
      });

      this.eventEmitter.emit('booking.expired', booking);
      this.logger.log(`Réservation expirée: ${booking.id}`);
    }
  }

  // ============================================================
  // UTILITAIRES
  // ============================================================

  private async getBookingWithCheck(bookingId: string, userId: string, role: 'sender' | 'carrier') {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Réservation introuvable');

    const ownerId = role === 'sender' ? booking.senderId : booking.carrierId;
    if (ownerId !== userId) throw new ForbiddenException('Accès non autorisé');

    return booking;
  }
}
