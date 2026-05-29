import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEmail, IsString, MinLength, MaxLength, IsEnum } from 'class-validator';
import { UserRole } from '../../common/prisma/prisma-client';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nom complet', example: 'Mamadou Diallo' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Email', example: 'mamadou@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Rôle utilisateur (sender, carrier ou both)',
    enum: [UserRole.SENDER, UserRole.CARRIER, UserRole.BOTH],
  })
  @IsOptional()
  @IsEnum([UserRole.SENDER, UserRole.CARRIER, UserRole.BOTH])
  role?: UserRole;
}
