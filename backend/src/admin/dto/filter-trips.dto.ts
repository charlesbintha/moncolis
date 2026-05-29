import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TripStatus } from '../../common/prisma/prisma-client';

export class AdminFilterTripsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TripStatus })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({ description: 'Ville de départ' })
  @IsOptional()
  @IsString()
  originCity?: string;

  @ApiPropertyOptional({ description: 'Ville d\'arrivée' })
  @IsOptional()
  @IsString()
  destinationCity?: string;

  @ApiPropertyOptional({ description: 'Date min (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date max (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'ID du transporteur' })
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional({ description: 'Recherche (nom ou téléphone du transporteur)' })
  @IsOptional()
  @IsString()
  search?: string;
}
