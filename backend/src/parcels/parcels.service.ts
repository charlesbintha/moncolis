import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CreateParcelRequestDto } from './dto/create-parcel.dto';
import { buildPaginationArgs, buildPaginationMeta, PaginationDto } from '../common/dto/pagination.dto';
import { ParcelStatus, TripStatus } from '../common/prisma/prisma-client';

@Injectable()
export class ParcelsService {
  private readonly logger = new Logger(ParcelsService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(senderId: string, dto: CreateParcelRequestDto, photos?: Express.Multer.File[]) {
    if (dto.originCity === dto.destinationCity) {
      throw new BadRequestException('Ville de départ et d\'arrivée doivent être différentes.');
    }

    const desiredDate = new Date(dto.desiredDate);
    if (desiredDate < new Date()) {
      throw new BadRequestException('La date souhaitée ne peut pas être dans le passé.');
    }

    // Upload des photos si présentes
    let photoUrls: string[] = [];
    if (photos && photos.length > 0) {
      photoUrls = await this.cloudinary.uploadImages(photos, 'parcels');
    }

    const parcel = await this.prisma.parcelRequest.create({
      data: {
        senderId,
        originCity: dto.originCity,
        destinationCity: dto.destinationCity,
        desiredDate,
        weightKg: dto.weightKg,
        description: dto.description,
        photoUrls,
        declaredValue: dto.declaredValue,
      },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true, rating: true } },
      },
    });

    // Déclencher le matching automatique
    this.eventEmitter.emit('parcel.created', parcel);
    this.logger.log(`Nouvelle demande colis: ${parcel.id} (${parcel.originCity} → ${parcel.destinationCity})`);

    return parcel;
  }

  async findAll(filters: any) {
    const { page = 1, limit = 20, originCity, destinationCity, desiredDate } = filters;
    const where: any = { status: ParcelStatus.OPEN };

    if (originCity) where.originCity = { contains: originCity, mode: 'insensitive' };
    if (destinationCity) where.destinationCity = { contains: destinationCity, mode: 'insensitive' };
    if (desiredDate) {
      const date = new Date(desiredDate);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.desiredDate = { gte: date, lt: nextDay };
    }

    const [total, parcels] = await Promise.all([
      this.prisma.parcelRequest.count({ where }),
      this.prisma.parcelRequest.findMany({
        where,
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, fullName: true, avatarUrl: true, rating: true, cniVerified: true } },
        },
      }),
    ]);

    return { data: parcels, pagination: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string) {
    const parcel = await this.prisma.parcelRequest.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true, rating: true, ratingCount: true } },
      },
    });
    if (!parcel) throw new NotFoundException('Demande de colis introuvable');
    return parcel;
  }

  async cancel(id: string, senderId: string) {
    const parcel = await this.findOne(id);
    if (parcel.senderId !== senderId) throw new ForbiddenException('Accès non autorisé');
    if (parcel.status === ParcelStatus.BOOKED) {
      throw new BadRequestException('Impossible d\'annuler une demande déjà réservée. Annulez la réservation.');
    }

    return this.prisma.parcelRequest.update({
      where: { id },
      data: { status: ParcelStatus.CANCELLED },
    });
  }

  async getMyParcels(senderId: string, page: number = 1, limit: number = 20) {
    const [total, parcels] = await Promise.all([
      this.prisma.parcelRequest.count({ where: { senderId } }),
      this.prisma.parcelRequest.findMany({
        where: { senderId },
        ...buildPaginationArgs(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data: parcels, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Matching automatique : trouve les trajets compatibles avec un colis
   */
  async findMatchingTrips(parcelId: string) {
    const parcel = await this.findOne(parcelId);

    // Tolérance de ±3 jours sur la date
    const dateMinus3 = new Date(parcel.desiredDate);
    dateMinus3.setDate(dateMinus3.getDate() - 3);
    const datePlus3 = new Date(parcel.desiredDate);
    datePlus3.setDate(datePlus3.getDate() + 3);

    return this.prisma.trip.findMany({
      where: {
        originCity: { equals: parcel.originCity, mode: 'insensitive' },
        destinationCity: { equals: parcel.destinationCity, mode: 'insensitive' },
        departureDate: { gte: dateMinus3, lte: datePlus3 },
        availableKg: { gte: parcel.weightKg },
        status: TripStatus.ACTIVE,
      },
      include: {
        carrier: { select: { id: true, fullName: true, avatarUrl: true, rating: true, cniVerified: true } },
      },
      orderBy: { carrier: { rating: 'desc' } },
    });
  }
}
