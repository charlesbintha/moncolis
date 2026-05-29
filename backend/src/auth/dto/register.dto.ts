import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../common/prisma/prisma-client';

/**
 * Format téléphone sénégalais : +221XXXXXXXXX (9 chiffres après l'indicatif)
 * Opérateurs : Orange (77), Free (76), Expresso (70), Tigo (75, 78)
 */
export const SENEGAL_PHONE_REGEX = /^\+221(7[0-9])[0-9]{7}$/;

export class SendOtpDto {
  @ApiProperty({
    description: 'Numéro de téléphone sénégalais',
    example: '+221771234567',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(SENEGAL_PHONE_REGEX, {
    message: 'Numéro de téléphone invalide. Format attendu: +221XXXXXXXXX',
  })
  phone: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Numéro de téléphone', example: '+221771234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(SENEGAL_PHONE_REGEX, {
    message: 'Numéro de téléphone invalide. Format attendu: +221XXXXXXXXX',
  })
  phone: string;

  @ApiProperty({ description: 'Code OTP reçu par SMS', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, { message: 'Le code OTP doit être composé de 6 chiffres' })
  otpCode: string;

  @ApiProperty({ description: 'Nom complet', example: 'Mamadou Diallo' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ description: 'Email (optionnel)', example: 'mamadou@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Rôle utilisateur',
    enum: UserRole,
    default: UserRole.SENDER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ description: 'Numéro de téléphone', example: '+221771234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(SENEGAL_PHONE_REGEX, {
    message: 'Numéro de téléphone invalide. Format attendu: +221XXXXXXXXX',
  })
  phone: string;

  @ApiProperty({ description: 'Code OTP reçu par SMS', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, { message: 'Le code OTP doit être composé de 6 chiffres' })
  otpCode: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Token de rafraîchissement' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
