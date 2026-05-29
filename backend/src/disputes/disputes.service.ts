import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException, Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CreateDisputeDto, ResolveDisputeDto } from './dto/create-dispute.dto';
import { BookingStatus, DisputeStatus } from '../common/prisma/prisma-client';
import { buildPaginationArgs, buildPaginationMeta } from '../common/dto/pagination.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);
  private readonly DISPUTE_WINDOW_HOURS = 48;

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private eventEmitter: EventEmitter2,
  ) {}

  async openDispute(
    userId: string,
    dto: CreateDisputeDto,
    evidenceFiles?: Express.Multer.File[],
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { dispute: true },
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');

    const isParticipant = booking.senderId === userId || booking.carrierId === userId;
    if (!isParticipant) throw new ForbiddenException('Accès non autorisé');

    if (booking.status !== BookingStatus.DELIVERED && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Un litige ne peut être ouvert que pour une livraison effectuée');
    }

    if (booking.dispute) {
      throw new ConflictException('Un litige existe déjà pour cette réservation');
    }

    // Vérifier la fenêtre de 48h après livraison
    const referenceDate = booking.confirmedAt || booking.deliveredAt;
    if (referenceDate) {
      const hoursSince = (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60);
      if (hoursSince > this.DISPUTE_WINDOW_HOURS) {
        throw new BadRequestException(
          `Le délai d'ouverture de litige (${this.DISPUTE_WINDOW_HOURS}h) est dépassé`,
        );
      }
    }

    // Upload des preuves
    let evidenceUrls: string[] = [];
    if (evidenceFiles && evidenceFiles.length > 0) {
      evidenceUrls = await this.cloudinary.uploadImages(evidenceFiles, 'disputes');
    }

    const dispute = await this.prisma.$transaction(async (tx) => {
      const d = await tx.dispute.create({
        data: {
          bookingId: dto.bookingId,
          openedById: userId,
          reason: dto.reason,
          description: dto.description,
          evidenceUrls,
        },
      });

      // Passer la réservation en DISPUTED
      await tx.booking.update({
        where: { id: dto.bookingId },
        data: { status: BookingStatus.DISPUTED },
      });

      return d;
    });

    this.eventEmitter.emit('dispute.opened', dispute);
    this.logger.log(`Litige ouvert: ${dispute.id} - Réservation: ${dto.bookingId}`);

    return dispute;
  }

  async resolveDispute(disputeId: string, adminId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { booking: { include: { payment: true } } },
    });

    if (!dispute) throw new NotFoundException('Litige introuvable');
    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new BadRequestException('Ce litige est déjà résolu');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          resolution: dto.resolution,
          resolvedById: adminId,
          resolvedAt: new Date(),
          refundAmount: dto.refundAmount,
        },
      });

      await tx.booking.update({
        where: { id: dispute.bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });
    });

    // Déclencher remboursement si nécessaire
    if (dto.refundAmount !== undefined) {
      this.eventEmitter.emit('dispute.resolved', {
        bookingId: dispute.bookingId,
        refundAmount: dto.refundAmount,
      });
    }

    this.logger.log(`Litige résolu: ${disputeId} par admin ${adminId}`);
    return this.prisma.dispute.findUnique({ where: { id: disputeId } });
  }

  async findAll(page: number = 1, limit: number = 20, status?: DisputeStatus) {
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
            select: {
              id: true, totalAmount: true,
              trip: { select: { originCity: true, destinationCity: true } },
            },
          },
        },
      }),
    ]);

    return { data: disputes, pagination: buildPaginationMeta(total, page, limit) };
  }

  async findMyDisputes(userId: string) {
    return this.prisma.dispute.findMany({
      where: { openedById: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        booking: { select: { id: true, status: true } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        openedBy: { select: { id: true, fullName: true } },
        resolvedBy: { select: { id: true, fullName: true } },
        booking: {
          include: {
            sender: { select: { id: true, fullName: true } },
            carrier: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException('Litige introuvable');

    const isParticipant =
      dispute.booking.senderId === userId ||
      dispute.booking.carrierId === userId ||
      dispute.openedById === userId;
    if (!isParticipant) throw new ForbiddenException('Accès non autorisé');

    return dispute;
  }
}
