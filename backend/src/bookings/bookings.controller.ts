import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, ConfirmDeliveryDto, UpdateStatusDto } from './dto/create-booking.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une réservation (expéditeur)' })
  create(@CurrentUser('id') senderId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(senderId, dto);
  }

  @Get('as-sender')
  @ApiOperation({ summary: 'Mes réservations en tant qu\'expéditeur' })
  getAsSender(@CurrentUser('id') userId: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.bookingsService.findMyBookings(userId, 'sender', page, limit);
  }

  @Get('as-carrier')
  @ApiOperation({ summary: 'Mes réservations en tant que transporteur' })
  getAsCarrier(@CurrentUser('id') userId: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.bookingsService.findMyBookings(userId, 'carrier', page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une réservation' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.findOne(id, userId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accepter une réservation (transporteur, délai 2h)' })
  accept(@Param('id') id: string, @CurrentUser('id') carrierId: string) {
    return this.bookingsService.accept(id, carrierId);
  }

  @Patch(':id/refuse')
  @ApiOperation({ summary: 'Refuser une réservation (transporteur)' })
  refuse(@Param('id') id: string, @CurrentUser('id') carrierId: string, @Body() dto: UpdateStatusDto) {
    return this.bookingsService.refuse(id, carrierId, dto.reason);
  }

  @Patch(':id/parcel-handed')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Marquer le colis comme remis (transporteur, photo obligatoire)' })
  markParcelHanded(
    @Param('id') id: string,
    @CurrentUser('id') carrierId: string,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return this.bookingsService.markParcelHanded(id, carrierId, photo);
  }

  @Patch(':id/in-transit')
  @ApiOperation({ summary: 'Marquer le colis en transit (transporteur)' })
  markInTransit(@Param('id') id: string, @CurrentUser('id') carrierId: string) {
    return this.bookingsService.markInTransit(id, carrierId);
  }

  @Patch(':id/delivered')
  @ApiOperation({ summary: 'Marquer le colis comme livré (transporteur)' })
  markDelivered(@Param('id') id: string, @CurrentUser('id') carrierId: string) {
    return this.bookingsService.markDelivered(id, carrierId);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmer la livraison avec le code OTP (expéditeur)' })
  confirmDelivery(
    @Param('id') id: string,
    @CurrentUser('id') senderId: string,
    @Body() dto: ConfirmDeliveryDto,
  ) {
    return this.bookingsService.confirmDelivery(id, senderId, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une réservation' })
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateStatusDto) {
    return this.bookingsService.cancelBooking(id, userId, dto.reason);
  }
}
