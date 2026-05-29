import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsDateString, IsNumber,
  IsPositive, IsOptional, Max, Min,
} from 'class-validator';

export class CreateParcelRequestDto {
  @ApiProperty({ description: 'Ville de départ', example: 'Dakar' })
  @IsString() @IsNotEmpty()
  originCity: string;

  @ApiProperty({ description: 'Ville de destination', example: 'Touba' })
  @IsString() @IsNotEmpty()
  destinationCity: string;

  @ApiProperty({ description: 'Date souhaitée d\'envoi', example: '2024-03-15' })
  @IsDateString()
  desiredDate: string;

  @ApiProperty({ description: 'Poids du colis en kg', example: 5, minimum: 0.1, maximum: 500 })
  @IsNumber() @IsPositive() @Max(500)
  weightKg: number;

  @ApiPropertyOptional({ description: 'Description du colis' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Valeur déclarée en FCFA (pour assurance)' })
  @IsOptional() @IsNumber() @IsPositive() @Min(0)
  declaredValue?: number;
}
