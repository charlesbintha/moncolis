import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { FilterTripsDto } from './dto/filter-trips.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @ApiOperation({ summary: 'Rechercher des trajets disponibles' })
  findAll(@Query() filters: FilterTripsDto) {
    return this.tripsService.findAll(filters);
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mes annonces de trajets' })
  getMyTrips(
    @CurrentUser('id') carrierId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.tripsService.getMyTrips(carrierId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un trajet' })
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Publier une annonce de trajet (transporteur)' })
  create(@CurrentUser('id') carrierId: string, @Body() dto: CreateTripDto) {
    return this.tripsService.create(carrierId, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Modifier une annonce de trajet' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') carrierId: string,
    @Body() dto: Partial<CreateTripDto>,
  ) {
    return this.tripsService.update(id, carrierId, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Annuler un trajet' })
  cancel(@Param('id') id: string, @CurrentUser('id') carrierId: string) {
    return this.tripsService.cancel(id, carrierId);
  }
}
