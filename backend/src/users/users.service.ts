import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { buildPaginationArgs, buildPaginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, phone: true, email: true, fullName: true,
        role: true, avatarUrl: true, cniVerified: true,
        rating: true, ratingCount: true,
        totalTrips: true, totalParcels: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async getProfile(userId: string) {
    return this.findById(userId);
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: userId } },
      });
      if (existing) throw new ConflictException('Cet email est déjà utilisé');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, phone: true, email: true, fullName: true,
        role: true, avatarUrl: true, cniVerified: true,
        rating: true, ratingCount: true,
      },
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const result = await this.cloudinary.uploadImage(file, 'avatars', `${userId}_avatar`);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.secure_url },
    });
    return { avatarUrl: result.secure_url };
  }

  async getUserStats(userId: string) {
    const [bookingsAsSender, bookingsAsCarrier, reviewsReceived] = await Promise.all([
      this.prisma.booking.count({ where: { senderId: userId, status: 'CONFIRMED' } }),
      this.prisma.booking.count({ where: { carrierId: userId, status: 'CONFIRMED' } }),
      this.prisma.review.findMany({
        where: { reviewedId: userId },
        select: { rating: true },
      }),
    ]);

    const avgRating = reviewsReceived.length > 0
      ? reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length
      : 0;

    return {
      completedParcels: bookingsAsSender,
      completedTrips: bookingsAsCarrier,
      totalReviews: reviewsReceived.length,
      averageRating: Math.round(avgRating * 10) / 10,
    };
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, avatarUrl: true,
        role: true, cniVerified: true,
        rating: true, ratingCount: true,
        totalTrips: true, totalParcels: true,
        createdAt: true,
        reviewsReceived: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            rating: true, comment: true, createdAt: true,
            reviewer: { select: { fullName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }
}
