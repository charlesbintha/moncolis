import {
  Controller, Get, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, DisputeStatus } from '../common/prisma/prisma-client';
import { AdminStatsService } from './services/admin-stats.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminDisputesService } from './services/admin-disputes.service';
import { AdminBookingsService } from './services/admin-bookings.service';
import { AdminTripsService } from './services/admin-trips.service';
import { AdminParcelsService } from './services/admin-parcels.service';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminFilterTripsDto } from './dto/filter-trips.dto';
import { AdminFilterParcelsDto } from './dto/filter-parcels.dto';
import { AdminFilterPaymentsDto } from './dto/filter-payments.dto';
import { SuspendDto } from './dto/suspend.dto';

class BanUserDto {
  @IsString() @IsNotEmpty() reason: string;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly stats: AdminStatsService,
    private readonly users: AdminUsersService,
    private readonly disputes: AdminDisputesService,
    private readonly bookings: AdminBookingsService,
    private readonly trips: AdminTripsService,
    private readonly parcels: AdminParcelsService,
    private readonly payments: AdminPaymentsService,
  ) {}

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Statistiques du tableau de bord' })
  getDashboard() {
    return this.stats.getDashboardStats();
  }

  @Get('dashboard/charts')
  @ApiOperation({ summary: 'Données des graphiques (revenus 6 mois, top corridors)' })
  getDashboardCharts() {
    return this.stats.getDashboardCharts();
  }

  // ─── Utilisateurs ────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Liste des utilisateurs' })
  getUsers(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search: string,
  ) {
    return this.users.getUsers(page, limit, search);
  }

  @Get('users/pending-cni')
  @ApiOperation({ summary: 'CNI en attente de validation' })
  getPendingCni(@Query('page') page: number, @Query('limit') limit: number) {
    return this.users.getPendingCni(page, limit);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Détails d\'un utilisateur' })
  getUserById(@Param('id') id: string) {
    return this.users.getUserById(id);
  }

  @Patch('users/:id/validate-cni')
  @ApiOperation({ summary: 'Valider la CNI d\'un utilisateur' })
  validateCni(@Param('id') userId: string, @CurrentUser('id') adminId: string) {
    return this.users.validateCni(userId, adminId);
  }

  @Patch('users/:id/reject-cni')
  @ApiOperation({ summary: 'Rejeter la CNI' })
  rejectCni(@Param('id') userId: string, @Body('reason') reason: string) {
    return this.users.rejectCni(userId, reason);
  }

  @Patch('users/:id/ban')
  @ApiOperation({ summary: 'Bannir un utilisateur' })
  banUser(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: BanUserDto,
  ) {
    return this.users.banUser(userId, adminId, dto.reason);
  }

  @Patch('users/:id/unban')
  @ApiOperation({ summary: 'Débannir un utilisateur' })
  unbanUser(@Param('id') userId: string) {
    return this.users.unbanUser(userId);
  }

  // ─── Litiges ─────────────────────────────────────────────────────────────────

  @Get('disputes')
  @ApiOperation({ summary: 'Liste des litiges' })
  getDisputes(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status: DisputeStatus,
  ) {
    return this.disputes.getDisputes(page, limit, status);
  }

  @Patch('disputes/:id/status')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un litige' })
  updateDisputeStatus(@Param('id') id: string, @Body('status') status: DisputeStatus) {
    return this.disputes.updateDisputeStatus(id, status);
  }

  // ─── Bookings ────────────────────────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({ summary: 'Toutes les réservations' })
  getBookings(@Query('page') page: number, @Query('limit') limit: number) {
    return this.bookings.getBookings(page, limit);
  }

  // ─── Trips ───────────────────────────────────────────────────────────────────

  @Get('trips')
  @ApiOperation({ summary: 'Liste des trajets avec filtres' })
  getTrips(@Query() filters: AdminFilterTripsDto) {
    return this.trips.getTrips(filters);
  }

  @Get('trips/:id')
  @ApiOperation({ summary: 'Détails d\'un trajet' })
  getTripById(@Param('id') id: string) {
    return this.trips.getTripById(id);
  }

  @Patch('trips/:id/suspend')
  @ApiOperation({ summary: 'Suspendre un trajet (modération)' })
  suspendTrip(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SuspendDto,
  ) {
    return this.trips.suspend(id, adminId, dto.reason);
  }

  // ─── Parcels ─────────────────────────────────────────────────────────────────

  @Get('parcels')
  @ApiOperation({ summary: 'Liste des colis avec filtres' })
  getParcels(@Query() filters: AdminFilterParcelsDto) {
    return this.parcels.getParcels(filters);
  }

  @Get('parcels/:id')
  @ApiOperation({ summary: 'Détails d\'un colis' })
  getParcelById(@Param('id') id: string) {
    return this.parcels.getParcelById(id);
  }

  @Patch('parcels/:id/suspend')
  @ApiOperation({ summary: 'Suspendre un colis (modération)' })
  suspendParcel(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SuspendDto,
  ) {
    return this.parcels.suspend(id, adminId, dto.reason);
  }

  // ─── Payments ────────────────────────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'Liste des paiements avec filtres' })
  getPayments(@Query() filters: AdminFilterPaymentsDto) {
    return this.payments.getPayments(filters);
  }

  @Get('payments/stats')
  @ApiOperation({ summary: 'Agrégats paiements (escrow, payouts en attente)' })
  getPaymentsStats() {
    return this.payments.getStats();
  }
}
