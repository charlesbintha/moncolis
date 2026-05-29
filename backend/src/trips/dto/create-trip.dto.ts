import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsDateString, IsNumber, IsPositive,
  IsOptional, IsEnum, Min, Max,
} from 'class-validator';
import { VehicleType } from '../../common/prisma/prisma-client';

// Villes sénégalaises (corridors prioritaires + autres grandes villes)
export const SENEGAL_CITIES = [
  'Dakar', 'Touba', 'Thiès', 'Ziguinchor', 'Saint-Louis',
  'Kaolack', 'Mbour', 'Diourbel', 'Louga', 'Tambacounda',
  'Kolda', 'Sédhiou', 'Kédougou', 'Matam', 'Fatick',
  'Rufisque', 'Tivaouane', 'Mbacké', 'Joal-Fadiouth',
  'Richard-Toll', 'Podor', 'Vélingara', 'Bignona',
];

export class CreateTripDto {
  @ApiProperty({ description: 'Ville de départ', example: 'Dakar' })
  @IsString()
  @IsNotEmpty()
  originCity: string;

  @ApiProperty({ description: 'Ville d\'arrivée', example: 'Touba' })
  @IsString()
  @IsNotEmpty()
  destinationCity: string;

  @ApiProperty({ description: 'Date et heure de départ (ISO 8601)', example: '2024-03-15T08:00:00Z' })
  @IsDateString()
  departureDate: string;

  @ApiProperty({ description: 'Kilos disponibles pour les colis', example: 20, minimum: 0.5, maximum: 1000 })
  @IsNumber()
  @IsPositive()
  @Max(1000)
  availableKg: number;

  @ApiProperty({ description: 'Prix par kg en FCFA', example: 1500 })
  @IsNumber()
  @IsPositive()
  @Min(100)
  pricePerKg: number;

  @ApiPropertyOptional({ enum: VehicleType, description: 'Type de véhicule' })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ description: 'Description / informations supplémentaires' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Lieu précis de départ (quartier, gare, etc.)' })
  @IsOptional()
  @IsString()
  originDetail?: string;

  @ApiPropertyOptional({ description: 'Lieu précis d\'arrivée' })
  @IsOptional()
  @IsString()
  destinationDetail?: string;
}
