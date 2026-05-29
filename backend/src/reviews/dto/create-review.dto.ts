import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID de la réservation', example: 'clxxxxxxxxx' })
  @IsString() @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'Note de 1 à 5', minimum: 1, maximum: 5 })
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Commentaire (optionnel)', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  comment?: string;
}
