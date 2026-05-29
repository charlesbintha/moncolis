import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { OtpService } from './otp.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { RegisterDto, LoginDto } from './dto/register.dto';
import { UserRole } from '../common/prisma/prisma-client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // ============================================================
  // ENVOI OTP
  // ============================================================

  async sendRegisterOtp(phone: string): Promise<{ message: string; otpCode?: string }> {
    // Vérifier que le numéro n'est pas déjà utilisé
    const existingUser = await this.prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      throw new ConflictException('Ce numéro de téléphone est déjà associé à un compte.');
    }

    const code = await this.otpService.sendOtp(phone, 'REGISTER');
    const response: { message: string; otpCode?: string } = { message: `Code OTP envoyé au ${phone}` };
    if (code) response.otpCode = code;
    return response;
  }

  async sendLoginOtp(phone: string): Promise<{ message: string; otpCode?: string }> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new NotFoundException('Aucun compte associé à ce numéro.');
    }
    if (user.isBanned) {
      throw new UnauthorizedException('Votre compte a été suspendu.');
    }

    const code = await this.otpService.sendOtp(phone, 'LOGIN', user.id);
    const response: { message: string; otpCode?: string } = { message: `Code OTP envoyé au ${phone}` };
    if (code) response.otpCode = code;
    return response;
  }

  // ============================================================
  // REGISTER
  // ============================================================

  async register(dto: RegisterDto): Promise<AuthTokens> {
    // 1. Vérifier l'OTP
    const isValid = await this.otpService.verifyOtp(dto.phone, dto.otpCode, 'REGISTER');
    if (!isValid) {
      throw new UnauthorizedException('Code OTP invalide ou expiré.');
    }

    // 2. Vérifier que le numéro n'existe pas
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('Ce numéro est déjà utilisé.');
    }

    // 3. Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role || UserRole.SENDER,
      },
    });

    this.logger.log(`Nouvel utilisateur inscrit: ${user.id} (${user.phone})`);

    // 4. Générer les tokens
    return this.generateTokens(user.id, user.phone, user.role);
  }

  // ============================================================
  // LOGIN
  // ============================================================

  async login(dto: LoginDto): Promise<AuthTokens & { user: any }> {
    // 1. Trouver l'utilisateur
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user || user.isBanned) {
      throw new UnauthorizedException('Numéro de téléphone ou OTP incorrect.');
    }

    // 2. Vérifier l'OTP
    const isValid = await this.otpService.verifyOtp(dto.phone, dto.otpCode, 'LOGIN');
    if (!isValid) {
      throw new UnauthorizedException('Code OTP invalide ou expiré.');
    }

    // 3. Générer les tokens
    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    this.logger.log(`Connexion: ${user.id} (${user.phone})`);

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        cniVerified: user.cniVerified,
        avatarUrl: user.avatarUrl,
        rating: user.rating,
      },
    };
  }

  // ============================================================
  // REFRESH TOKEN
  // ============================================================

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.isRevoked ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }

    const { user } = tokenRecord;
    if (!user.isActive || user.isBanned) {
      throw new UnauthorizedException('Compte inactif ou banni.');
    }

    // Révoquer l'ancien token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(user.id, user.phone, user.role);
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
  }

  // ============================================================
  // UPLOAD CNI
  // ============================================================

  async uploadCni(
    userId: string,
    frontFile: Express.Multer.File,
    backFile: Express.Multer.File,
  ): Promise<{ message: string }> {
    const [frontResult, backResult] = await Promise.all([
      this.cloudinaryService.uploadImage(frontFile, 'cni', `${userId}_cni_front`),
      this.cloudinaryService.uploadImage(backFile, 'cni', `${userId}_cni_back`),
    ]);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        cniFrontUrl: frontResult.secure_url,
        cniBackUrl: backResult.secure_url,
        // La vérification se fait manuellement par l'admin
      },
    });

    return { message: 'Documents CNI soumis avec succès. En attente de validation par l\'équipe ColiSN.' };
  }

  // ============================================================
  // UTILITAIRES PRIVÉS
  // ============================================================

  private async generateTokens(
    userId: string,
    phone: string,
    role: UserRole,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, phone, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.generateRefreshToken(userId),
    ]);

    return { accessToken, refreshToken };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const refreshDays = 30;
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
