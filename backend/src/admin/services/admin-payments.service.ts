import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BookingStatus, PaymentStatus } from '../../common/prisma/prisma-client';
import { buildPaginationArgs, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { AdminFilterPaymentsDto } from '../dto/filter-payments.dto';

const COMMISSION_RATE = 0.12;

@Injectable()
export class AdminPaymentsService {
  constructor(private prisma: PrismaService) {}

  async getPayments(filters: AdminFilterPaymentsDto) {
    const { page = 1, limit = 20 } = filters;
    const where = this.buildWhere(filters);

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              sender: { select: { id: true, fullName: true, phone: true } },
              carrier: { select: { id: true, fullName: true, phone: true } },
              trip: { select: { originCity: true, destinationCity: true } },
            },
          },
        },
      }),
    ]);

    return { data: payments, pagination: buildPaginationMeta(total, page, limit) };
  }

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [held, released, refunded, pendingPayouts, releasedThisMonth, releasedLastMonth] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.HELD },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.RELEASED },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.REFUNDED },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            status: PaymentStatus.HELD,
            booking: { status: BookingStatus.CONFIRMED },
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            status: PaymentStatus.RELEASED,
            releasedAt: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            status: PaymentStatus.RELEASED,
            releasedAt: { gte: startOfLastMonth, lt: startOfMonth },
          },
          _sum: { amount: true },
        }),
      ]);

    const commissionThisMonth = Math.round(
      (releasedThisMonth._sum.amount || 0) * COMMISSION_RATE,
    );
    const commissionLastMonth = Math.round(
      (releasedLastMonth._sum.amount || 0) * COMMISSION_RATE,
    );

    return {
      held: { amount: held._sum.amount || 0, count: held._count._all },
      released: { amount: released._sum.amount || 0, count: released._count._all },
      refunded: { amount: refunded._sum.amount || 0, count: refunded._count._all },
      pendingPayouts: {
        amount: pendingPayouts._sum.amount || 0,
        count: pendingPayouts._count._all,
      },
      commissionThisMonth,
      commissionLastMonth,
    };
  }

  private buildWhere(filters: AdminFilterPaymentsDto) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      where.OR = [
        { bookingId: { contains: filters.search } },
        { providerRef: { contains: filters.search } },
      ];
    }
    return where;
  }
}
