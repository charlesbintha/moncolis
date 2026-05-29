import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './services/admin-stats.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminDisputesService } from './services/admin-disputes.service';
import { AdminBookingsService } from './services/admin-bookings.service';
import { AdminTripsService } from './services/admin-trips.service';
import { AdminParcelsService } from './services/admin-parcels.service';
import { AdminPaymentsService } from './services/admin-payments.service';

@Module({
  controllers: [AdminController],
  providers: [
    AdminStatsService,
    AdminUsersService,
    AdminDisputesService,
    AdminBookingsService,
    AdminTripsService,
    AdminParcelsService,
    AdminPaymentsService,
  ],
})
export class AdminModule {}
