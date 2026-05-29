import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParcelsService } from './parcels.service';
import { CreateParcelRequestDto } from './dto/create-parcel.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('parcels')
@Controller('parcels')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Get()
  @ApiOperation({ summary: 'Rechercher des demandes de colis' })
  findAll(@Query() filters: any) {
    return this.parcelsService.findAll(filters);
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mes demandes de colis' })
  getMyParcels(@CurrentUser('id') senderId: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.parcelsService.getMyParcels(senderId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une demande de colis' })
  findOne(@Param('id') id: string) {
    return this.parcelsService.findOne(id);
  }

  @Get(':id/matching-trips')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Trouver les trajets compatibles avec ce colis' })
  findMatchingTrips(@Param('id') id: string) {
    return this.parcelsService.findMatchingTrips(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('photos', 5))
  @ApiOperation({ summary: 'Publier une demande de colis (expéditeur)' })
  create(
    @CurrentUser('id') senderId: string,
    @Body() dto: CreateParcelRequestDto,
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    return this.parcelsService.create(senderId, dto, photos);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Annuler une demande de colis' })
  cancel(@Param('id') id: string, @CurrentUser('id') senderId: string) {
    return this.parcelsService.cancel(id, senderId);
  }
}
