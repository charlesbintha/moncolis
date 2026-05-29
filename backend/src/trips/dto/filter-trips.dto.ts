import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterTripsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Ville de départ', example: 'Dakar' })
  @IsOptional()
  @IsString()
  originCity?: string;

  @ApiPropertyOptional({ description: 'Ville d\'arrivée', example: 'Touba' })
  @IsOptional()
  @IsString()
  destinationCity?: string;

  @ApiPropertyOptional({ description: 'Date de départ (format YYYY-MM-DD)', example: '2024-03-15' })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiPropertyOptional({ description: 'Poids minimum disponible en kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minKg?: number;

  @ApiPropertyOptional({ description: 'Prix maximum par kg en FCFA' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPricePerKg?: number;

  @ApiPropertyOptional({ description: 'Note minimale du transporteur (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number;
}
