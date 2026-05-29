import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '../../common/prisma/prisma-client';
import { buildPaginationArgs, buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private prisma: PrismaService) {}

  async getUsers(page: number = 1, limit: number = 20, search?: string) {
    const where: any = { role: { not: UserRole.ADMIN } };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, phone: true, email: true, fullName: true,
          role: true, cniVerified: true, cniFrontUrl: true, cniBackUrl: true,
          rating: true, ratingCount: true, totalTrips: true, totalParcels: true,
          isActive: true, isBanned: true, bannedAt: true, bannedReason: true,
          createdAt: true,
        },
      }),
    ]);

    return { data: users, pagination: buildPaginationMeta(total, page, limit) };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tripsAsCarrier: { orderBy: { createdAt: 'desc' }, take: 5 },
        parcelRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
        bookingsAsSender: { orderBy: { createdAt: 'desc' }, take: 5 },
        bookingsAsCarrier: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async getPendingCni(page: number = 1, limit: number = 20) {
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where: { cniFrontUrl: { not: null }, cniVerified: false } }),
      this.prisma.user.findMany({
        where: { cniFrontUrl: { not: null }, cniVerified: false },
        ...buildPaginationArgs(page, limit),
        select: {
          id: true, fullName: true, phone: true,
          cniFrontUrl: true, cniBackUrl: true, createdAt: true,
        },
      }),
    ]);

    return { data: users, pagination: buildPaginationMeta(total, page, limit) };
  }

  async validateCni(userId: string, adminId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        cniVerified: true,
        cniVerifiedAt: new Date(),
        cniVerifiedBy: adminId,
      },
    });
    this.logger.log(`CNI validée: utilisateur ${userId} par admin ${adminId}`);
    return { message: 'CNI validée avec succès' };
  }

  async rejectCni(userId: string, _reason: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { cniFrontUrl: null, cniBackUrl: null },
    });
    return { message: 'CNI rejetée' };
  }

  async banUser(userId: string, adminId: string, reason: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: reason,
        bannedBy: adminId,
      },
    });
    this.logger.log(`Utilisateur banni: ${userId} par admin ${adminId} - Raison: ${reason}`);
    return { message: 'Utilisateur banni' };
  }

  async unbanUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, bannedAt: null, bannedReason: null, bannedBy: null },
    });
    return { message: 'Utilisateur débanni' };
  }
}
