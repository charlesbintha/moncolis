import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, Max,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID du trajet', example: 'clxxxxxxxxx' })
  @IsString() @IsNotEmpty()
  tripId: string;

  @ApiProperty({ description: 'ID de la demande de colis', example: 'clxxxxxxxxx' })
  @IsString() @IsNotEmpty()
  parcelRequestId: string;
}

export class ConfirmDeliveryDto {
  @ApiProperty({ description: 'Code de livraison à 6 caractères', example: 'AB1234' })
  @IsString() @IsNotEmpty()
  deliveryCode: string;
}

export class UpdateStatusDto {
  @ApiProperty({ description: 'Raison d\'annulation ou refus', example: 'Véhicule en panne' })
  @IsOptional() @IsString()
  reason?: string;
}
