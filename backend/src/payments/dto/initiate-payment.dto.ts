import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { PaymentMethod } from '../../common/prisma/prisma-client';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'ID de la réservation', example: 'clxxxxxxxxx' })
  @IsString() @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Méthode de paiement' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Numéro de téléphone pour Wave ou Orange Money', example: '+221771234567' })
  @IsString() @IsNotEmpty()
  phoneNumber: string;
}
