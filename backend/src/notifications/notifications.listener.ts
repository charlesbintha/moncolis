import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '../common/prisma/prisma-client';

/**
 * Écouteur d'événements pour les notifications automatiques
 * Se déclenche sur les événements métier (booking, payment, dispute...)
 */
@Injectable()
export class NotificationsListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('booking.created')
  async onBookingCreated(booking: any) {
    // Notifier le transporteur
    await this.notificationsService.sendNotification(
      booking.carrierId,
      NotificationType.BOOKING_REQUEST,
      '📦 Nouvelle demande de transport',
      `${booking.sender?.fullName || 'Un expéditeur'} souhaite vous confier un colis. Vous avez 2h pour accepter.`,
      { bookingId: booking.id },
    );
  }

  @OnEvent('booking.accepted')
  async onBookingAccepted({ booking, senderId }: any) {
    await this.notificationsService.sendNotification(
      senderId,
      NotificationType.BOOKING_ACCEPTED,
      '✅ Réservation acceptée !',
      'Votre transporteur a accepté. Procédez au paiement pour confirmer.',
      { bookingId: booking.id },
    );
  }

  @OnEvent('booking.refused')
  async onBookingRefused({ booking, senderId }: any) {
    await this.notificationsService.sendNotification(
      senderId,
      NotificationType.BOOKING_REFUSED,
      '❌ Réservation refusée',
      'Le transporteur ne peut pas transporter votre colis. Cherchez un autre trajet.',
      { bookingId: booking.id },
    );
  }

  @OnEvent('booking.parcel_handed')
  async onParcelHanded(booking: any) {
    await this.notificationsService.sendNotification(
      booking.senderId,
      NotificationType.PARCEL_HANDED,
      '🤝 Colis remis au transporteur',
      'Votre colis a été remis. Le transport est en cours.',
      { bookingId: booking.id },
    );
  }

  @OnEvent('booking.in_transit')
  async onInTransit(booking: any) {
    await this.notificationsService.sendNotification(
      booking.senderId,
      NotificationType.IN_TRANSIT,
      '🚗 Colis en route !',
      'Votre colis est en cours de livraison.',
      { bookingId: booking.id },
    );
  }

  @OnEvent('booking.delivered')
  async onDelivered(booking: any) {
    await this.notificationsService.sendNotification(
      booking.senderId,
      NotificationType.DELIVERED,
      '📬 Colis livré !',
      `Votre colis est arrivé. Confirmez la réception avec le code: ${booking.deliveryCode}`,
      { bookingId: booking.id },
    );
  }

  @OnEvent('booking.confirmed')
  async onConfirmed(booking: any) {
    await this.notificationsService.sendNotification(
      booking.carrierId,
      NotificationType.PAYMENT_RELEASED,
      '💰 Paiement reçu !',
      `${booking.carrierAmount} FCFA ont été transférés vers votre compte.`,
      { bookingId: booking.id },
    );
  }

  @OnEvent('booking.expired')
  async onBookingExpired(booking: any) {
    await Promise.all([
      this.notificationsService.sendNotification(
        booking.senderId,
        NotificationType.BOOKING_REFUSED,
        '⏱ Réservation expirée',
        'Le transporteur n\'a pas répondu dans les 2h. Cherchez un autre trajet.',
        { bookingId: booking.id },
      ),
      this.notificationsService.sendNotification(
        booking.carrierId,
        NotificationType.SYSTEM,
        '⏱ Délai expiré',
        'Vous n\'avez pas répondu à temps. La réservation a été annulée.',
        { bookingId: booking.id },
      ),
    ]);
  }

  @OnEvent('dispute.opened')
  async onDisputeOpened(dispute: any) {
    // TODO: Notifier l'admin
  }

  @OnEvent('trip.created')
  async onTripCreated(trip: any) {
    // TODO: Matching automatique - notifier les expéditeurs avec des colis compatibles
  }

  @OnEvent('parcel.created')
  async onParcelCreated(parcel: any) {
    // TODO: Matching automatique - notifier les transporteurs avec des trajets compatibles
  }
}
