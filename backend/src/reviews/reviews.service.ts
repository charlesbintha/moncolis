import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException, Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { BookingStatus } from '../common/prisma/prisma-client';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly REVIEW_DEADLINE_HOURS = 72;

  constructor(private prisma: PrismaService) {}

  async create(reviewerId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Seules les livraisons confirmées peuvent être évaluées');
    }

    // Vérifier que le reviewer est un participant
    const isSender = booking.senderId === reviewerId;
    const isCarrier = booking.carrierId === reviewerId;
    if (!isSender && !isCarrier) throw new ForbiddenException('Accès non autorisé');

    // Vérifier qu'il n'a pas déjà noté
    const existingReview = await this.prisma.review.findFirst({
      where: { bookingId: dto.bookingId, reviewerId },
    });
    if (existingReview) throw new ConflictException('Vous avez déjà évalué cette transaction');

    // Vérifier le délai de 72h
    if (booking.confirmedAt) {
      const deadlineMs = this.REVIEW_DEADLINE_HOURS * 60 * 60 * 1000;
      if (Date.now() - booking.confirmedAt.getTime() > deadlineMs) {
        throw new BadRequestException(`Le délai d'évaluation (${this.REVIEW_DEADLINE_HOURS}h) est dépassé`);
      }
    }

    const reviewedId = isSender ? booking.carrierId : booking.senderId;
    const expiresAt = new Date(
      (booking.confirmedAt?.getTime() || Date.now()) + this.REVIEW_DEADLINE_HOURS * 60 * 60 * 1000,
    );

    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        reviewerId,
        reviewedId,
        rating: dto.rating,
        comment: dto.comment,
        expiresAt,
      },
    });

    // Recalculer la note moyenne de l'utilisateur noté
    await this.updateUserRating(reviewedId);

    this.logger.log(`Évaluation créée: ${reviewerId} → ${reviewedId} - Note: ${dto.rating}/5`);

    return review;
  }

  private async updateUserRating(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { reviewedId: userId },
      select: { rating: true },
    });

    if (reviews.length === 0) return;

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        ratingCount: reviews.length,
      },
    });
  }

  async getUserReviews(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where: { reviewedId: userId } }),
      this.prisma.review.findMany({
        where: { reviewedId: userId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
          booking: {
            select: {
              trip: { select: { originCity: true, destinationCity: true } },
            },
          },
        },
      }),
    ]);
    return { data: reviews, total, page, limit };
  }
}
