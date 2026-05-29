import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ParcelStatus } from '../../common/prisma/prisma-client';
import { buildPaginationArgs, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { AdminFilterParcelsDto } from '../dto/filter-parcels.dto';

@Injectable()
export class AdminParcelsService {
  private readonly logger = new Logger(AdminParcelsService.name);

  constructor(private prisma: PrismaService) {}

  async getParcels(filters: AdminFilterParcelsDto) {
    const { page = 1, limit = 20 } = filters;
    const where = this.buildWhere(filters);

    const [total, parcels] = await Promise.all([
      this.prisma.parcelRequest.count({ where }),
      this.prisma.parcelRequest.findMany({
        where,
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true, fullName: true, phone: true,
              rating: true, ratingCount: true, cniVerified: true,
            },
          },
          _count: { select: { bookings: true } },
        },
      }),
    ]);

    return { data: parcels, pagination: buildPaginationMeta(total, page, limit) };
  }

  async getParcelById(id: string) {
    const parcel = await this.prisma.parcelRequest.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true, fullName: true, phone: true, email: true,
            rating: true, ratingCount: true, totalParcels: true,
            cniVerified: true, isBanned: true, createdAt: true,
          },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: {
            carrier: { select: { id: true, fullName: true, phone: true } },
            trip: { select: { id: true, originCity: true, destinationCity: true, departureDate: true } },
            payment: { select: { amount: true, status: true, method: true } },
          },
        },
      },
    });
    if (!parcel) throw new NotFoundException('Colis introuvable');
    return parcel;
  }

  async suspend(id: string, adminId: string, reason: string) {
    const parcel = await this.prisma.parcelRequest.findUnique({ where: { id } });
    if (!parcel) throw new NotFoundException('Colis introuvable');
    if (parcel.status === ParcelStatus.CANCELLED) {
      throw new BadRequestException('Colis déjà annulé');
    }
    if (parcel.status === ParcelStatus.BOOKED) {
      throw new BadRequestException(
        'Impossible de suspendre un colis déjà réservé. Passez par la résolution de litige.',
      );
    }

    const updated = await this.prisma.parcelRequest.update({
      where: { id },
      data: { status: ParcelStatus.CANCELLED },
    });

    this.logger.warn(
      `Colis suspendu: ${id} par admin ${adminId} - Raison: ${reason}`,
    );

    return { message: 'Colis suspendu', parcel: updated };
  }

  private buildWhere(filters: AdminFilterParcelsDto) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.originCity) {
      where.originCity = { equals: filters.originCity, mode: 'insensitive' };
    }
    if (filters.destinationCity) {
      where.destinationCity = { equals: filters.destinationCity, mode: 'insensitive' };
    }
    if (filters.senderId) where.senderId = filters.senderId;
    if (filters.dateFrom || filters.dateTo) {
      where.desiredDate = {};
      if (filters.dateFrom) where.desiredDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.desiredDate.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      where.sender = {
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
        ],
      };
    }
    return where;
  }
}
