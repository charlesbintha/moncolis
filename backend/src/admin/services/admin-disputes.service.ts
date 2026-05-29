import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DisputeStatus } from '../../common/prisma/prisma-client';
import { buildPaginationArgs, buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminDisputesService {
  constructor(private prisma: PrismaService) {}

  async getDisputes(page: number = 1, limit: number = 20, status?: DisputeStatus) {
    const where: any = {};
    if (status) where.status = status;

    const [total, disputes] = await Promise.all([
      this.prisma.dispute.count({ where }),
      this.prisma.dispute.findMany({
        where,
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        include: {
          openedBy: { select: { id: true, fullName: true, phone: true } },
          booking: {
            include: {
              sender: { select: { id: true, fullName: true } },
              carrier: { select: { id: true, fullName: true } },
              trip: { select: { originCity: true, destinationCity: true } },
              payment: { select: { amount: true, status: true } },
            },
          },
        },
      }),
    ]);

    return { data: disputes, pagination: buildPaginationMeta(total, page, limit) };
  }

  async updateDisputeStatus(disputeId: string, status: DisputeStatus) {
    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status },
    });
  }
}
