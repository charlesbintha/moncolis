import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { FilterTripsDto } from './dto/filter-trips.dto';
import { buildPaginationArgs, buildPaginationMeta } from '../common/dto/pagination.dto';
import { TripStatus, UserRole } from '../common/prisma/prisma-client';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(carrierId: string, dto: CreateTripDto) {
    // Vérifier que l'utilisateur est transporteur
    const user = await this.prisma.user.findUnique({ where: { id: carrierId } });
    if (!user || (user.role !== UserRole.CARRIER && user.role !== UserRole.BOTH && user.role !== UserRole.ADMIN)) {
      throw new ForbiddenException('Seuls les transporteurs peuvent créer des annonces de trajet.');
    }

    if (dto.originCity === dto.destinationCity) {
      throw new BadRequestException('La ville de départ et d\'arrivée doivent être différentes.');
    }

    const departureDate = new Date(dto.departureDate);
    if (departureDate < new Date()) {
      throw new BadRequestException('La date de départ ne peut pas être dans le passé.');
    }

    const trip = await this.prisma.trip.create({
      data: {
        carrierId,
        originCity: dto.originCity,
        destinationCity: dto.destinationCity,
        departureDate,
        availableKg: dto.availableKg,
        pricePerKg: dto.pricePerKg,
        vehicleType: dto.vehicleType,
        description: dto.description,
        originDetail: dto.originDetail,
        destinationDetail: dto.destinationDetail,
      },
      include: {
        carrier: {
          select: { id: true, fullName: true, avatarUrl: true, rating: true, cniVerified: true },
        },
      },
    });

    // Déclencher le matching automatique
    this.eventEmitter.emit('trip.created', trip);
    this.logger.log(`Nouveau trajet créé: ${trip.id} (${trip.originCity} → ${trip.destinationCity})`);

    return trip;
  }

  async findAll(filters: FilterTripsDto) {
    const { page = 1, limit = 20, originCity, destinationCity, departureDate, minKg, maxPricePerKg, minRating } = filters;

    const where: any = {
      status: TripStatus.ACTIVE,
    };

    if (originCity) where.originCity = { contains: originCity, mode: 'insensitive' };
    if (destinationCity) where.destinationCity = { contains: destinationCity, mode: 'insensitive' };
    if (departureDate) {
      const date = new Date(departureDate);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.departureDate = { gte: date, lt: nextDay };
    }
    if (minKg) {
      where.availableKg = { gte: minKg };
    }
    if (maxPricePerKg) where.pricePerKg = { lte: maxPricePerKg };
    if (minRating) {
      where.carrier = { rating: { gte: minRating } };
    }

    const [total, trips] = await Promise.all([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        ...buildPaginationArgs(page, limit),
        orderBy: [
          { carrier: { rating: 'desc' } }, // Tri par note par défaut
          { departureDate: 'asc' },
        ],
        include: {
          carrier: {
            select: { id: true, fullName: true, avatarUrl: true, rating: true, ratingCount: true, cniVerified: true },
          },
        },
      }),
    ]);

    return {
      data: trips,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        carrier: {
          select: {
            id: true, fullName: true, avatarUrl: true,
            rating: true, ratingCount: true, cniVerified: true,
            totalTrips: true, createdAt: true,
          },
        },
      },
    });
    if (!trip) throw new NotFoundException('Annonce de trajet introuvable');
    return trip;
  }

  async update(id: string, carrierId: string, dto: Partial<CreateTripDto>) {
    const trip = await this.findOne(id);
    if (trip.carrierId !== carrierId) throw new ForbiddenException('Accès non autorisé');
    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException('Impossible de modifier un trajet non actif');
    }

    return this.prisma.trip.update({
      where: { id },
      data: {
        ...(dto.originCity && { originCity: dto.originCity }),
        ...(dto.destinationCity && { destinationCity: dto.destinationCity }),
        ...(dto.departureDate && { departureDate: new Date(dto.departureDate) }),
        ...(dto.availableKg && { availableKg: dto.availableKg }),
        ...(dto.pricePerKg && { pricePerKg: dto.pricePerKg }),
        ...(dto.vehicleType && { vehicleType: dto.vehicleType }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.originDetail !== undefined && { originDetail: dto.originDetail }),
        ...(dto.destinationDetail !== undefined && { destinationDetail: dto.destinationDetail }),
      },
    });
  }

  async cancel(id: string, carrierId: string) {
    const trip = await this.findOne(id);
    if (trip.carrierId !== carrierId) throw new ForbiddenException('Accès non autorisé');
    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException('Seuls les trajets actifs peuvent être annulés');
    }

    // Vérifier s'il y a des bookings actifs
    const activeBookings = await this.prisma.booking.count({
      where: {
        tripId: id,
        status: { in: ['PENDING', 'ACCEPTED', 'PARCEL_HANDED', 'IN_TRANSIT'] },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException(
        `Impossible d'annuler : ${activeBookings} réservation(s) active(s) sur ce trajet.`,
      );
    }

    return this.prisma.trip.update({
      where: { id },
      data: { status: TripStatus.CANCELLED },
    });
  }

  async getMyTrips(carrierId: string, page: number = 1, limit: number = 20) {
    const [total, trips] = await Promise.all([
      this.prisma.trip.count({ where: { carrierId } }),
      this.prisma.trip.findMany({
        where: { carrierId },
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        include: {
          bookings: {
            where: { status: { in: ['ACCEPTED', 'PARCEL_HANDED', 'IN_TRANSIT'] } },
            select: { id: true, status: true, weightKg: true },
          },
        },
      }),
    ]);

    return { data: trips, pagination: buildPaginationMeta(total, page, limit) };
  }
}
