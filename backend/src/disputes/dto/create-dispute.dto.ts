import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateDisputeDto {
  @ApiProperty({ description: 'ID de la réservation', example: 'clxxxxxxxxx' })
  @IsString() @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'Raison du litige', example: 'Colis endommagé à la livraison' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  reason: string;

  @ApiPropertyOptional({ description: 'Description détaillée', maxLength: 1000 })
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ description: 'Décision de l\'admin / résolution' })
  @IsString() @IsNotEmpty() @MaxLength(1000)
  resolution: string;

  @ApiPropertyOptional({ description: 'Montant du remboursement en FCFA (0 = aucun, null = total)' })
  @IsOptional()
  refundAmount?: number;
}
