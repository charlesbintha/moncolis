import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationArgs, buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminBookingsService {
  constructor(private prisma: PrismaService) {}

  async getBookings(page: number = 1, limit: number = 20) {
    const [total, data] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.findMany({
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, fullName: true, phone: true } },
          carrier: { select: { id: true, fullName: true, phone: true } },
          trip: { select: { originCity: true, destinationCity: true } },
          payment: { select: { amount: true, status: true, method: true } },
        },
      }),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }
}
