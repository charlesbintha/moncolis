import {
  PrismaClient, UserRole, BookingStatus, PaymentMethod, PaymentStatus,
  ParcelStatus, TripStatus, DisputeStatus, NotificationType,
} from '@prisma/client';

const prisma = new PrismaClient();

const COMMISSION_RATE = 0.12;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function deliveryCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * DAY);
}

function daysFromNow(n: number) {
  return new Date(Date.now() + n * DAY);
}

async function main() {
  console.log('🌱 Seeding de la base de données ColiSN...');

  // Nettoyage des données dépendantes (idempotent)
  console.log('🧹 Nettoyage des données existantes…');
  await prisma.notification.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.parcelRequest.deleteMany({});
  await prisma.trip.deleteMany({});

  // ─── Utilisateurs ─────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: '+221700000000' },
    update: {},
    create: {
      phone: '+221700000000',
      email: 'admin@colisn.sn',
      fullName: 'Admin ColiSN',
      role: UserRole.ADMIN,
      cniVerified: true,
      isActive: true,
    },
  });

  const sender = await prisma.user.upsert({
    where: { phone: '+221771234567' },
    update: {},
    create: {
      phone: '+221771234567',
      fullName: 'Moussa Diallo',
      role: UserRole.SENDER,
      cniVerified: true,
      rating: 4.5,
      ratingCount: 10,
      totalParcels: 10,
    },
  });

  const sender2 = await prisma.user.upsert({
    where: { phone: '+221772345678' },
    update: {},
    create: {
      phone: '+221772345678',
      fullName: 'Awa Sarr',
      role: UserRole.SENDER,
      cniVerified: true,
      rating: 4.7,
      ratingCount: 15,
      totalParcels: 15,
    },
  });

  const carrier = await prisma.user.upsert({
    where: { phone: '+221781234567' },
    update: {},
    create: {
      phone: '+221781234567',
      fullName: 'Fatou Ndiaye',
      role: UserRole.CARRIER,
      cniVerified: true,
      rating: 4.8,
      ratingCount: 25,
      totalTrips: 25,
    },
  });

  const carrier2 = await prisma.user.upsert({
    where: { phone: '+221782345678' },
    update: {},
    create: {
      phone: '+221782345678',
      fullName: 'Ibrahima Faye',
      role: UserRole.CARRIER,
      cniVerified: true,
      rating: 4.3,
      ratingCount: 18,
      totalTrips: 18,
    },
  });

  const both = await prisma.user.upsert({
    where: { phone: '+221761234567' },
    update: {},
    create: {
      phone: '+221761234567',
      fullName: 'Amadou Sow',
      role: UserRole.BOTH,
      cniVerified: true,
      rating: 4.2,
      ratingCount: 8,
    },
  });

  console.log(`✅ Utilisateurs: 1 admin + 5 testeurs`);

  // ─── Trajets ──────────────────────────────────────────────────
  const tripDakarTouba = await prisma.trip.create({
    data: {
      carrierId: carrier.id,
      originCity: 'Dakar',
      destinationCity: 'Touba',
      departureDate: daysFromNow(2),
      availableKg: 50,
      pricePerKg: 500,
      vehicleType: 'CAR',
      description: 'Départ gare routière de Dakar, arrivée centre de Touba',
    },
  });

  const tripDakarStLouis = await prisma.trip.create({
    data: {
      carrierId: both.id,
      originCity: 'Dakar',
      destinationCity: 'Saint-Louis',
      departureDate: daysFromNow(3),
      availableKg: 30,
      pricePerKg: 700,
      vehicleType: 'MINIBUS',
    },
  });

  const tripDakarZig = await prisma.trip.create({
    data: {
      carrierId: carrier.id,
      originCity: 'Dakar',
      destinationCity: 'Ziguinchor',
      departureDate: daysFromNow(5),
      availableKg: 100,
      pricePerKg: 1200,
      vehicleType: 'BUS',
      description: 'Via Kaolack et Kolda',
    },
  });

  const tripDakarThies = await prisma.trip.create({
    data: {
      carrierId: carrier2.id,
      originCity: 'Dakar',
      destinationCity: 'Thiès',
      departureDate: daysFromNow(1),
      availableKg: 40,
      pricePerKg: 300,
      vehicleType: 'CAR',
    },
  });

  const tripPastConfirmed = await prisma.trip.create({
    data: {
      carrierId: carrier.id,
      originCity: 'Dakar',
      destinationCity: 'Mbour',
      departureDate: daysAgo(20),
      availableKg: 25,
      pricePerKg: 400,
      vehicleType: 'CAR',
      status: TripStatus.COMPLETED,
    },
  });

  const tripPastConfirmed2 = await prisma.trip.create({
    data: {
      carrierId: both.id,
      originCity: 'Dakar',
      destinationCity: 'Touba',
      departureDate: daysAgo(45),
      availableKg: 60,
      pricePerKg: 500,
      vehicleType: 'MINIBUS',
      status: TripStatus.COMPLETED,
    },
  });

  console.log(`✅ Trajets: 6 (4 actifs, 2 complétés)`);

  // ─── Colis (parcel requests) ──────────────────────────────────
  const parcelOpen = await prisma.parcelRequest.create({
    data: {
      senderId: sender.id,
      originCity: 'Dakar',
      destinationCity: 'Touba',
      desiredDate: daysFromNow(2),
      weightKg: 5,
      description: 'Documents et petit colis pour la famille',
      declaredValue: 50000,
      status: ParcelStatus.OPEN,
    },
  });

  const parcelMatched = await prisma.parcelRequest.create({
    data: {
      senderId: sender2.id,
      originCity: 'Dakar',
      destinationCity: 'Saint-Louis',
      desiredDate: daysFromNow(3),
      weightKg: 8,
      description: 'Vêtements et produits cosmétiques',
      declaredValue: 75000,
      status: ParcelStatus.MATCHED,
    },
  });

  const parcelBooked1 = await prisma.parcelRequest.create({
    data: {
      senderId: sender.id,
      originCity: 'Dakar',
      destinationCity: 'Ziguinchor',
      desiredDate: daysFromNow(5),
      weightKg: 12,
      description: 'Pièces auto pour atelier',
      declaredValue: 200000,
      status: ParcelStatus.BOOKED,
    },
  });

  const parcelBooked2 = await prisma.parcelRequest.create({
    data: {
      senderId: sender2.id,
      originCity: 'Dakar',
      destinationCity: 'Thiès',
      desiredDate: daysFromNow(1),
      weightKg: 3,
      description: 'Médicaments urgents',
      declaredValue: 30000,
      status: ParcelStatus.BOOKED,
    },
  });

  const parcelBookedPast1 = await prisma.parcelRequest.create({
    data: {
      senderId: sender.id,
      originCity: 'Dakar',
      destinationCity: 'Mbour',
      desiredDate: daysAgo(20),
      weightKg: 6,
      description: 'Cadeau anniversaire',
      declaredValue: 40000,
      status: ParcelStatus.BOOKED,
    },
  });

  const parcelBookedPast2 = await prisma.parcelRequest.create({
    data: {
      senderId: sender2.id,
      originCity: 'Dakar',
      destinationCity: 'Touba',
      desiredDate: daysAgo(45),
      weightKg: 10,
      description: 'Matériel électroménager',
      declaredValue: 150000,
      status: ParcelStatus.BOOKED,
    },
  });

  console.log(`✅ Colis: 6 (1 ouvert, 1 matché, 4 réservés)`);

  // ─── Réservations + Paiements ─────────────────────────────────
  // Booking 1 — PENDING (en attente d'acceptation)
  const totalAmount1 = parcelMatched.weightKg * tripDakarStLouis.pricePerKg;
  const commission1 = Math.round(totalAmount1 * COMMISSION_RATE);
  const booking1 = await prisma.booking.create({
    data: {
      tripId: tripDakarStLouis.id,
      parcelRequestId: parcelMatched.id,
      senderId: parcelMatched.senderId,
      carrierId: tripDakarStLouis.carrierId,
      weightKg: parcelMatched.weightKg,
      totalAmount: totalAmount1,
      commission: commission1,
      carrierAmount: totalAmount1 - commission1,
      deliveryCode: deliveryCode(),
      status: BookingStatus.PENDING,
      acceptDeadline: new Date(Date.now() + 2 * HOUR),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      amount: totalAmount1,
      method: PaymentMethod.WAVE,
      status: PaymentStatus.PENDING,
    },
  });

  // Booking 2 — ACCEPTED
  const totalAmount2 = parcelBooked2.weightKg * tripDakarThies.pricePerKg;
  const commission2 = Math.round(totalAmount2 * COMMISSION_RATE);
  const booking2 = await prisma.booking.create({
    data: {
      tripId: tripDakarThies.id,
      parcelRequestId: parcelBooked2.id,
      senderId: parcelBooked2.senderId,
      carrierId: tripDakarThies.carrierId,
      weightKg: parcelBooked2.weightKg,
      totalAmount: totalAmount2,
      commission: commission2,
      carrierAmount: totalAmount2 - commission2,
      deliveryCode: deliveryCode(),
      status: BookingStatus.ACCEPTED,
      acceptedAt: new Date(Date.now() - 1 * HOUR),
      acceptDeadline: new Date(Date.now() + 1 * HOUR),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking2.id,
      amount: totalAmount2,
      method: PaymentMethod.ORANGE_MONEY,
      status: PaymentStatus.HELD,
      heldAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  });

  // Booking 3 — IN_TRANSIT
  const totalAmount3 = parcelBooked1.weightKg * tripDakarZig.pricePerKg;
  const commission3 = Math.round(totalAmount3 * COMMISSION_RATE);
  const booking3 = await prisma.booking.create({
    data: {
      tripId: tripDakarZig.id,
      parcelRequestId: parcelBooked1.id,
      senderId: parcelBooked1.senderId,
      carrierId: tripDakarZig.carrierId,
      weightKg: parcelBooked1.weightKg,
      totalAmount: totalAmount3,
      commission: commission3,
      carrierAmount: totalAmount3 - commission3,
      deliveryCode: deliveryCode(),
      status: BookingStatus.IN_TRANSIT,
      acceptedAt: daysAgo(1),
      parcelHandedAt: new Date(Date.now() - 12 * HOUR),
      inTransitAt: new Date(Date.now() - 6 * HOUR),
      acceptDeadline: daysAgo(1),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking3.id,
      amount: totalAmount3,
      method: PaymentMethod.CARD,
      status: PaymentStatus.HELD,
      heldAt: daysAgo(1),
      providerRef: 'pi_test_3xK9mN2qR',
    },
  });

  // Booking 4 — CONFIRMED (livré + payé) — dans le mois courant
  const totalAmount4 = parcelBookedPast1.weightKg * tripPastConfirmed.pricePerKg;
  const commission4 = Math.round(totalAmount4 * COMMISSION_RATE);
  const booking4 = await prisma.booking.create({
    data: {
      tripId: tripPastConfirmed.id,
      parcelRequestId: parcelBookedPast1.id,
      senderId: parcelBookedPast1.senderId,
      carrierId: tripPastConfirmed.carrierId,
      weightKg: parcelBookedPast1.weightKg,
      totalAmount: totalAmount4,
      commission: commission4,
      carrierAmount: totalAmount4 - commission4,
      deliveryCode: deliveryCode(),
      status: BookingStatus.CONFIRMED,
      acceptedAt: daysAgo(22),
      parcelHandedAt: daysAgo(21),
      inTransitAt: daysAgo(21),
      deliveredAt: daysAgo(20),
      confirmedAt: daysAgo(20),
      acceptDeadline: daysAgo(22),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking4.id,
      amount: totalAmount4,
      method: PaymentMethod.WAVE,
      status: PaymentStatus.RELEASED,
      heldAt: daysAgo(22),
      releasedAt: daysAgo(20),
      providerRef: 'wave_ref_8721',
    },
  });
  await prisma.review.create({
    data: {
      bookingId: booking4.id,
      reviewerId: booking4.senderId,
      reviewedId: booking4.carrierId,
      rating: 5,
      comment: 'Livraison rapide, transporteur très pro. Recommandé !',
      expiresAt: daysFromNow(20),
    },
  });

  // Booking 5 — CONFIRMED — mois précédent
  const totalAmount5 = parcelBookedPast2.weightKg * tripPastConfirmed2.pricePerKg;
  const commission5 = Math.round(totalAmount5 * COMMISSION_RATE);
  const booking5 = await prisma.booking.create({
    data: {
      tripId: tripPastConfirmed2.id,
      parcelRequestId: parcelBookedPast2.id,
      senderId: parcelBookedPast2.senderId,
      carrierId: tripPastConfirmed2.carrierId,
      weightKg: parcelBookedPast2.weightKg,
      totalAmount: totalAmount5,
      commission: commission5,
      carrierAmount: totalAmount5 - commission5,
      deliveryCode: deliveryCode(),
      status: BookingStatus.CONFIRMED,
      acceptedAt: daysAgo(47),
      parcelHandedAt: daysAgo(46),
      inTransitAt: daysAgo(46),
      deliveredAt: daysAgo(45),
      confirmedAt: daysAgo(45),
      acceptDeadline: daysAgo(47),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking5.id,
      amount: totalAmount5,
      method: PaymentMethod.ORANGE_MONEY,
      status: PaymentStatus.RELEASED,
      heldAt: daysAgo(47),
      releasedAt: daysAgo(45),
      providerRef: 'om_ref_5532',
    },
  });

  // Booking 6 — DISPUTED (litige actif)
  const trip6 = await prisma.trip.create({
    data: {
      carrierId: carrier2.id,
      originCity: 'Dakar',
      destinationCity: 'Kaolack',
      departureDate: daysAgo(5),
      availableKg: 20,
      pricePerKg: 600,
      vehicleType: 'CAR',
      status: TripStatus.COMPLETED,
    },
  });
  const parcel6 = await prisma.parcelRequest.create({
    data: {
      senderId: sender.id,
      originCity: 'Dakar',
      destinationCity: 'Kaolack',
      desiredDate: daysAgo(5),
      weightKg: 7,
      description: 'Produits alimentaires fragiles',
      declaredValue: 60000,
      status: ParcelStatus.BOOKED,
    },
  });
  const totalAmount6 = parcel6.weightKg * trip6.pricePerKg;
  const commission6 = Math.round(totalAmount6 * COMMISSION_RATE);
  const booking6 = await prisma.booking.create({
    data: {
      tripId: trip6.id,
      parcelRequestId: parcel6.id,
      senderId: parcel6.senderId,
      carrierId: trip6.carrierId,
      weightKg: parcel6.weightKg,
      totalAmount: totalAmount6,
      commission: commission6,
      carrierAmount: totalAmount6 - commission6,
      deliveryCode: deliveryCode(),
      status: BookingStatus.DISPUTED,
      acceptedAt: daysAgo(6),
      parcelHandedAt: daysAgo(5),
      inTransitAt: daysAgo(5),
      deliveredAt: daysAgo(4),
      acceptDeadline: daysAgo(6),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking6.id,
      amount: totalAmount6,
      method: PaymentMethod.WAVE,
      status: PaymentStatus.HELD,
      heldAt: daysAgo(6),
    },
  });

  // Booking 7 — DISPUTED résolu (refund partiel)
  const trip7 = await prisma.trip.create({
    data: {
      carrierId: carrier.id,
      originCity: 'Dakar',
      destinationCity: 'Diourbel',
      departureDate: daysAgo(15),
      availableKg: 15,
      pricePerKg: 450,
      vehicleType: 'CAR',
      status: TripStatus.COMPLETED,
    },
  });
  const parcel7 = await prisma.parcelRequest.create({
    data: {
      senderId: sender2.id,
      originCity: 'Dakar',
      destinationCity: 'Diourbel',
      desiredDate: daysAgo(15),
      weightKg: 4,
      description: 'Petit électronique',
      declaredValue: 80000,
      status: ParcelStatus.BOOKED,
    },
  });
  const totalAmount7 = parcel7.weightKg * trip7.pricePerKg;
  const commission7 = Math.round(totalAmount7 * COMMISSION_RATE);
  const booking7 = await prisma.booking.create({
    data: {
      tripId: trip7.id,
      parcelRequestId: parcel7.id,
      senderId: parcel7.senderId,
      carrierId: trip7.carrierId,
      weightKg: parcel7.weightKg,
      totalAmount: totalAmount7,
      commission: commission7,
      carrierAmount: totalAmount7 - commission7,
      deliveryCode: deliveryCode(),
      status: BookingStatus.CONFIRMED,
      acceptedAt: daysAgo(16),
      parcelHandedAt: daysAgo(15),
      inTransitAt: daysAgo(15),
      deliveredAt: daysAgo(14),
      confirmedAt: daysAgo(13),
      acceptDeadline: daysAgo(16),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking7.id,
      amount: totalAmount7,
      method: PaymentMethod.WAVE,
      status: PaymentStatus.REFUNDED,
      heldAt: daysAgo(16),
      refundedAt: daysAgo(12),
    },
  });

  console.log(`✅ Réservations: 7 (1 PENDING, 1 ACCEPTED, 1 IN_TRANSIT, 2 CONFIRMED, 1 DISPUTED, 1 résolu)`);
  console.log(`✅ Paiements: 7 (1 PENDING, 2 HELD, 2 RELEASED, 1 HELD-disputed, 1 REFUNDED)`);

  // ─── Litiges ──────────────────────────────────────────────────
  await prisma.dispute.create({
    data: {
      bookingId: booking6.id,
      openedById: booking6.senderId,
      reason: 'Colis endommagé à la livraison',
      description: "Le colis est arrivé avec l'emballage déchiré et les produits alimentaires sont écrasés. Photos jointes.",
      evidenceUrls: [],
      status: DisputeStatus.OPEN,
    },
  });

  await prisma.dispute.create({
    data: {
      bookingId: booking7.id,
      openedById: booking7.senderId,
      reason: 'Retard important sur la livraison',
      description: 'La livraison était prévue le 14 mais le colis a été remis avec 36h de retard sans communication.',
      evidenceUrls: [],
      status: DisputeStatus.RESOLVED,
      resolution: 'Remboursement partiel accordé (50%) suite au retard avéré. Le transporteur a été averti.',
      resolvedById: admin.id,
      resolvedAt: daysAgo(12),
      refundAmount: Math.round(totalAmount7 * 0.5),
    },
  });

  // 3ème dispute en cours de revue (pour montrer toutes les statuts)
  const trip8 = await prisma.trip.create({
    data: {
      carrierId: both.id,
      originCity: 'Dakar',
      destinationCity: 'Tambacounda',
      departureDate: daysAgo(8),
      availableKg: 30,
      pricePerKg: 800,
      vehicleType: 'BUS',
      status: TripStatus.COMPLETED,
    },
  });
  const parcel8 = await prisma.parcelRequest.create({
    data: {
      senderId: sender.id,
      originCity: 'Dakar',
      destinationCity: 'Tambacounda',
      desiredDate: daysAgo(8),
      weightKg: 9,
      description: 'Pièces mécaniques',
      declaredValue: 120000,
      status: ParcelStatus.BOOKED,
    },
  });
  const totalAmount8 = parcel8.weightKg * trip8.pricePerKg;
  const commission8 = Math.round(totalAmount8 * COMMISSION_RATE);
  const booking8 = await prisma.booking.create({
    data: {
      tripId: trip8.id,
      parcelRequestId: parcel8.id,
      senderId: parcel8.senderId,
      carrierId: trip8.carrierId,
      weightKg: parcel8.weightKg,
      totalAmount: totalAmount8,
      commission: commission8,
      carrierAmount: totalAmount8 - commission8,
      deliveryCode: deliveryCode(),
      status: BookingStatus.DISPUTED,
      acceptedAt: daysAgo(9),
      parcelHandedAt: daysAgo(8),
      inTransitAt: daysAgo(8),
      deliveredAt: daysAgo(7),
      acceptDeadline: daysAgo(9),
    },
  });
  await prisma.payment.create({
    data: {
      bookingId: booking8.id,
      amount: totalAmount8,
      method: PaymentMethod.CARD,
      status: PaymentStatus.HELD,
      heldAt: daysAgo(9),
      providerRef: 'pi_test_dispute',
    },
  });
  await prisma.dispute.create({
    data: {
      bookingId: booking8.id,
      openedById: booking8.carrierId,
      reason: 'Contestation du contenu déclaré',
      description: 'Le poids réel du colis dépasse largement les 9kg déclarés. Surcoût demandé.',
      evidenceUrls: [],
      status: DisputeStatus.UNDER_REVIEW,
    },
  });

  console.log(`✅ Litiges: 3 (1 OPEN, 1 UNDER_REVIEW, 1 RESOLVED)`);

  // ─── Notifications ────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      // Pour Moussa (sender, +221771234567) — il a plusieurs bookings
      {
        userId: sender.id,
        type: NotificationType.BOOKING_ACCEPTED,
        title: 'Réservation acceptée',
        body: `Fatou a accepté votre colis pour le trajet Dakar → Touba.`,
        data: { bookingId: booking4.id },
        isRead: true,
        readAt: daysAgo(21),
        createdAt: daysAgo(22),
      },
      {
        userId: sender.id,
        type: NotificationType.IN_TRANSIT,
        title: 'Colis en transit',
        body: 'Votre colis pour Ziguinchor est en route. Suivez son statut.',
        data: { bookingId: booking3.id },
        isRead: false,
        createdAt: new Date(Date.now() - 6 * HOUR),
      },
      {
        userId: sender.id,
        type: NotificationType.DISPUTE_OPENED,
        title: 'Litige ouvert',
        body: 'Votre litige sur le colis Dakar → Kaolack a été enregistré.',
        data: { bookingId: booking6.id, disputeReason: 'Colis endommagé' },
        isRead: false,
        createdAt: daysAgo(4),
      },
      {
        userId: sender.id,
        type: NotificationType.PARCEL_MATCH,
        title: 'Nouveau trajet correspondant',
        body: 'Un transporteur propose un trajet Dakar → Thiès. Réservez maintenant.',
        data: { tripId: tripDakarThies.id },
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      // Pour Fatou (carrier, +221781234567)
      {
        userId: carrier.id,
        type: NotificationType.BOOKING_REQUEST,
        title: 'Nouvelle demande de réservation',
        body: 'Moussa souhaite envoyer un colis (12 kg) sur votre trajet Ziguinchor.',
        data: { bookingId: booking3.id },
        isRead: true,
        readAt: daysAgo(1),
        createdAt: daysAgo(1),
      },
      {
        userId: carrier.id,
        type: NotificationType.PAYMENT_RELEASED,
        title: 'Paiement versé',
        body: `Vos gains sur la livraison Dakar → Mbour ont été versés (${(totalAmount4 - commission4).toLocaleString('fr')} FCFA).`,
        data: { bookingId: booking4.id, amount: totalAmount4 - commission4 },
        isRead: false,
        createdAt: daysAgo(20),
      },
      {
        userId: carrier.id,
        type: NotificationType.REVIEW_RECEIVED,
        title: 'Nouvel avis client',
        body: 'Moussa vous a laissé une note 5 étoiles ⭐',
        data: { bookingId: booking4.id, rating: 5 },
        isRead: false,
        createdAt: daysAgo(20),
      },
      {
        userId: carrier.id,
        type: NotificationType.SYSTEM,
        title: 'Bienvenue sur ColiSN 👋',
        body: "Pensez à compléter votre profil et vérifier votre CNI pour plus de confiance auprès des expéditeurs.",
        data: {},
        isRead: true,
        readAt: daysAgo(30),
        createdAt: daysAgo(30),
      },
      // Pour Awa (sender, +221772345678)
      {
        userId: sender2.id,
        type: NotificationType.BOOKING_ACCEPTED,
        title: 'Réservation acceptée',
        body: 'Ibrahima a accepté votre colis pour Thiès.',
        data: { bookingId: booking2.id },
        isRead: false,
        createdAt: new Date(Date.now() - 1 * HOUR),
      },
      {
        userId: sender2.id,
        type: NotificationType.DISPUTE_RESOLVED,
        title: 'Litige résolu',
        body: 'Remboursement partiel accordé pour votre colis Dakar → Diourbel.',
        data: { bookingId: booking7.id },
        isRead: false,
        createdAt: daysAgo(12),
      },
    ],
  });
  console.log(`✅ Notifications: 10 (réparties sur 3 users)`);

  console.log('\n🎉 Seeding terminé avec succès !');
  console.log('\n📋 Comptes de test:');
  console.log('   Admin       : +221700000000');
  console.log('   Expéditeurs : +221771234567 (Moussa), +221772345678 (Awa)');
  console.log('   Transporteurs: +221781234567 (Fatou), +221782345678 (Ibrahima)');
  console.log('   Les deux    : +221761234567 (Amadou)');
  console.log('\n💡 Tous les OTP en mode dev sont affichés dans les logs.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
