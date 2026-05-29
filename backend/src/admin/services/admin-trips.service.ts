import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TripStatus } from '../../common/prisma/prisma-client';
import { buildPaginationArgs, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { AdminFilterTripsDto } from '../dto/filter-trips.dto';

@Injectable()
export class AdminTripsService {
  private readonly logger = new Logger(AdminTripsService.name);

  constructor(private prisma: PrismaService) {}

  async getTrips(filters: AdminFilterTripsDto) {
    const { page = 1, limit = 20 } = filters;
    const where = this.buildWhere(filters);

    const [total, trips] = await Promise.all([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        include: {
          carrier: {
            select: {
              id: true, fullName: true, phone: true,
              rating: true, ratingCount: true, cniVerified: true,
            },
          },
          _count: { select: { bookings: true } },
        },
      }),
    ]);

    return { data: trips, pagination: buildPaginationMeta(total, page, limit) };
  }

  async getTripById(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        carrier: {
          select: {
            id: true, fullName: true, phone: true, email: true,
            rating: true, ratingCount: true, totalTrips: true,
            cniVerified: true, isBanned: true, createdAt: true,
          },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, fullName: true, phone: true } },
            payment: { select: { amount: true, status: true, method: true } },
          },
        },
      },
    });
    if (!trip) throw new NotFoundException('Trajet introuvable');
    return trip;
  }

  async suspend(id: string, adminId: string, reason: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trajet introuvable');
    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Trajet déjà annulé');
    }
    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestException('Trajet déjà terminé');
    }

    const updated = await this.prisma.trip.update({
      where: { id },
      data: { status: TripStatus.CANCELLED },
    });

    this.logger.warn(
      `Trajet suspendu: ${id} par admin ${adminId} - Raison: ${reason}`,
    );

    return { message: 'Trajet suspendu', trip: updated };
  }

  private buildWhere(filters: AdminFilterTripsDto) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.originCity) {
      where.originCity = { equals: filters.originCity, mode: 'insensitive' };
    }
    if (filters.destinationCity) {
      where.destinationCity = { equals: filters.destinationCity, mode: 'insensitive' };
    }
    if (filters.carrierId) where.carrierId = filters.carrierId;
    if (filters.dateFrom || filters.dateTo) {
      where.departureDate = {};
      if (filters.dateFrom) where.departureDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.departureDate.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      where.carrier = {
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
        ],
      };
    }
    return where;
  }
}
