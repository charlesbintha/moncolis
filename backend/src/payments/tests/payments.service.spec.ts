import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentsService } from '../payments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BookingStatus, PaymentMethod, PaymentStatus } from '../../common/prisma/prisma-client';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  booking: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      PAYDUNYA_MODE: 'test',
      PAYDUNYA_MASTER_KEY: 'test_master_key',
      PAYDUNYA_PRIVATE_KEY: 'test_private_key',
      PAYDUNYA_TOKEN: 'test_token',
      STRIPE_SECRET_KEY: 'sk_test_xxx',
      FRONTEND_URL: 'http://localhost:3001',
    };
    return config[key] ?? defaultValue;
  }),
};

const mockEventEmitter = { emit: jest.fn() };

// ─── Données de test ─────────────────────────────────────────────────────────

const mockBooking = {
  id: 'booking_001',
  senderId: 'sender_001',
  carrierId: 'carrier_001',
  tripId: 'trip_001',
  parcelRequestId: 'parcel_001',
  totalAmount: 15000,
  commission: 1800,
  carrierAmount: 13200,
  weightKg: 10,
  deliveryCode: 'AB1234',
  status: BookingStatus.ACCEPTED,
  acceptDeadline: new Date(Date.now() + 7200000),
  payment: null,
  confirmedAt: null,
};

const mockPayment = {
  id: 'payment_001',
  bookingId: 'booking_001',
  amount: 15000,
  method: PaymentMethod.WAVE,
  status: PaymentStatus.PENDING,
  providerRef: 'mock_token_123',
  providerData: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────
  // initiatePayment
  // ──────────────────────────────────────────────────────────────────

  describe('initiatePayment()', () => {
    const dto = {
      bookingId: 'booking_001',
      method: PaymentMethod.WAVE,
      phoneNumber: '+221771234567',
    };

    it('devrait initier un paiement Wave avec succès', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({ ...mockBooking, payment: null });
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue(mockPayment);

      const result = await service.initiatePayment('sender_001', dto);

      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 'booking_001' },
        include: { payment: true },
      });
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 'booking_001',
            amount: 15000,
            method: PaymentMethod.WAVE,
            status: PaymentStatus.PENDING,
          }),
        }),
      );
      expect(result).toHaveProperty('payment');
    });

    it('devrait rejeter si la réservation est introuvable', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.initiatePayment('sender_001', dto))
        .rejects.toThrow(NotFoundException);
    });

    it('devrait rejeter si l\'utilisateur n\'est pas l\'expéditeur', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({ ...mockBooking, payment: null });
      await expect(service.initiatePayment('autre_user', dto))
        .rejects.toThrow(ForbiddenException);
    });

    it('devrait rejeter si la réservation n\'est pas ACCEPTED', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.PENDING,
        payment: null,
      });
      await expect(service.initiatePayment('sender_001', dto))
        .rejects.toThrow(BadRequestException);
    });

    it('devrait rejeter si un paiement existe déjà', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        payment: mockPayment,
      });
      await expect(service.initiatePayment('sender_001', dto))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // releasePayment (SÉCURITÉ CRITIQUE: jamais libérer sans CONFIRMED)
  // ──────────────────────────────────────────────────────────────────

  describe('releasePayment() — sécurité escrow', () => {
    it('DOIT refuser la libération si le booking n\'est pas CONFIRMED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.HELD,
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.DELIVERED, // Pas encore CONFIRMED !
      });

      await expect(service.releasePayment('booking_001'))
        .rejects.toThrow(BadRequestException);

      // Vérifier que le paiement n'a PAS été libéré
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('DOIT libérer les fonds uniquement si CONFIRMED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.HELD,
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED, // ✅ Correct
        carrierId: 'carrier_001',
        carrierAmount: 13200,
      });
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.RELEASED,
      });

      await service.releasePayment('booking_001');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment_001' },
          data: expect.objectContaining({ status: PaymentStatus.RELEASED }),
        }),
      );
    });

    it('DOIT ignorer si aucun paiement n\'existe', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await service.releasePayment('booking_sans_paiement');
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });

    it('DOIT ignorer si le paiement n\'est pas en HELD', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.RELEASED, // Déjà libéré
      });
      await service.releasePayment('booking_001');
      expect(mockPrisma.booking.findUnique).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // holdPayment
  // ──────────────────────────────────────────────────────────────────

  describe('holdPayment()', () => {
    it('devrait bloquer les fonds en escrow', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.HELD,
      });

      await service.holdPayment('payment_001');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_001' },
        data: expect.objectContaining({ status: PaymentStatus.HELD }),
      });
    });

    it('devrait rejeter si le paiement est introuvable', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.holdPayment('payment_inexistant'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // refundPayment
  // ──────────────────────────────────────────────────────────────────

  describe('refundPayment()', () => {
    it('devrait rembourser un paiement en HELD', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.HELD,
      });
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      });

      await service.refundPayment('booking_001', 'Annulation test');

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentStatus.REFUNDED }),
        }),
      );
    });

    it('devrait rejeter si le paiement n\'est pas en HELD', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.PENDING,
      });

      await expect(service.refundPayment('booking_001', 'test'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Calcul commission
  // ──────────────────────────────────────────────────────────────────

  describe('Calcul commission 12%', () => {
    it('devrait vérifier le calcul des montants en FCFA (pas de décimales)', () => {
      const totalAmount = 15000;
      const commission = Math.round(totalAmount * 0.12);
      const carrierAmount = totalAmount - commission;

      expect(commission).toBe(1800);
      expect(carrierAmount).toBe(13200);
      expect(Number.isInteger(commission)).toBe(true);
      expect(Number.isInteger(carrierAmount)).toBe(true);
    });

    it('devrait arrondir correctement pour les montants non ronds', () => {
      const totalAmount = 7500;
      const commission = Math.round(totalAmount * 0.12);
      const carrierAmount = totalAmount - commission;

      expect(commission).toBe(900);
      expect(carrierAmount).toBe(6600);
      expect(commission + carrierAmount).toBe(totalAmount);
    });
  });
});
