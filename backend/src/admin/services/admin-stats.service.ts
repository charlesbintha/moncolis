import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BookingStatus, DisputeStatus, UserRole } from '../../common/prisma/prisma-client';

const COMMISSION_RATE = 0.12;

@Injectable()
export class AdminStatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers, newUsersThisMonth, newUsersLastMonth,
      totalBookings, activeBookings, completedBookings,
      bookingsThisMonth, bookingsLastMonth,
      openDisputes,
      totalRevenue, revenueThisMonth, revenueLastMonth,
      pendingCni,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { not: UserRole.ADMIN } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),
      this.prisma.booking.count(),
      this.prisma.booking.count({
        where: {
          status: {
            in: [BookingStatus.ACCEPTED, BookingStatus.PARCEL_HANDED, BookingStatus.IN_TRANSIT],
          },
        },
      }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.booking.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),
      this.prisma.dispute.count({
        where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'RELEASED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'RELEASED', releasedAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'RELEASED',
          releasedAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.user.count({ where: { cniFrontUrl: { not: null }, cniVerified: false } }),
    ]);

    const totalCommission = Math.round((totalRevenue._sum.amount || 0) * COMMISSION_RATE);
    const monthlyCommission = Math.round((revenueThisMonth._sum.amount || 0) * COMMISSION_RATE);

    return {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        pendingCniValidation: pendingCni,
        trendVsLastMonth: percentTrend(newUsersThisMonth, newUsersLastMonth),
      },
      bookings: {
        total: totalBookings,
        active: activeBookings,
        completed: completedBookings,
        trendVsLastMonth: percentTrend(bookingsThisMonth, bookingsLastMonth),
      },
      revenue: {
        totalTransactions: totalRevenue._sum.amount || 0,
        totalCommission,
        thisMonth: revenueThisMonth._sum.amount || 0,
        monthlyCommission,
        trendVsLastMonth: percentTrend(
          revenueThisMonth._sum.amount || 0,
          revenueLastMonth._sum.amount || 0,
        ),
      },
      disputes: {
        open: openDisputes,
      },
    };
  }

  async getDashboardCharts() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'RELEASED',
        releasedAt: { gte: sixMonthsAgo },
      },
      select: { amount: true, releasedAt: true },
    });

    const buckets = new Map<string, { revenue: number; commission: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { revenue: 0, commission: 0 });
    }
    for (const p of payments) {
      if (!p.releasedAt) continue;
      const key = `${p.releasedAt.getFullYear()}-${String(p.releasedAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.revenue += p.amount;
        bucket.commission += Math.round(p.amount * COMMISSION_RATE);
      }
    }

    const monthLabelsFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const revenueByMonth = Array.from(buckets.entries()).map(([key, value]) => {
      const [, month] = key.split('-');
      return {
        month: monthLabelsFr[parseInt(month, 10) - 1],
        revenue: value.revenue,
        commission: value.commission,
      };
    });

    const corridorsRaw = await this.prisma.booking.groupBy({
      by: ['tripId'],
      where: { status: BookingStatus.CONFIRMED },
      _count: { _all: true },
      orderBy: { _count: { tripId: 'desc' } },
      take: 20,
    });
    const tripIds = corridorsRaw.map((c) => c.tripId);
    const trips = tripIds.length
      ? await this.prisma.trip.findMany({
          where: { id: { in: tripIds } },
          select: { id: true, originCity: true, destinationCity: true },
        })
      : [];
    const tripMap = new Map(trips.map((t) => [t.id, t]));

    const corridorTotals = new Map<string, number>();
    for (const c of corridorsRaw) {
      const trip = tripMap.get(c.tripId);
      if (!trip) continue;
      const route = `${trip.originCity}→${trip.destinationCity}`;
      corridorTotals.set(route, (corridorTotals.get(route) || 0) + c._count._all);
    }
    const topCorridors = Array.from(corridorTotals.entries())
      .map(([route, bookings]) => ({ route, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);

    return { revenueByMonth, topCorridors };
  }
}

function percentTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
