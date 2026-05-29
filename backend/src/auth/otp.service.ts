import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AfricasTalking = require('africastalking');

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly at: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.at = AfricasTalking({
      apiKey: configService.get<string>('AFRICAS_TALKING_API_KEY'),
      username: configService.get<string>('AFRICAS_TALKING_USERNAME'),
    });
  }

  /**
   * Génère un code OTP à 6 chiffres
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Envoie un OTP par SMS et le persiste en base
   */
  async sendOtp(phone: string, purpose: string, userId?: string): Promise<string | void> {
    const expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);
    const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 3);
    const cooldownSeconds = this.configService.get<number>('OTP_RESEND_COOLDOWN_SECONDS', 60);

    // Vérifier le rate limiting (max 3 OTP en 10 minutes)
    const recentOtpCount = await this.prisma.oTPCode.count({
      where: {
        phone,
        purpose,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // 10 min
        },
      },
    });

    if (recentOtpCount >= maxAttempts) {
      throw new HttpException(
        `Trop de tentatives. Veuillez patienter 10 minutes avant de réessayer.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Vérifier le cooldown (1 minute entre deux envois)
    const lastOtp = await this.prisma.oTPCode.findFirst({
      where: { phone, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (lastOtp) {
      const secondsSinceLast = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
      if (secondsSinceLast < cooldownSeconds) {
        const waitSeconds = Math.ceil(cooldownSeconds - secondsSinceLast);
        throw new BadRequestException(
          `Veuillez attendre ${waitSeconds} secondes avant de renvoyer un SMS.`,
        );
      }
    }

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Invalider les anciens OTPs pour ce téléphone/purpose
    await this.prisma.oTPCode.updateMany({
      where: { phone, purpose, isUsed: false },
      data: { isUsed: true },
    });

    // Créer le nouvel OTP
    await this.prisma.oTPCode.create({
      data: {
        phone,
        code,
        userId,
        purpose,
        expiresAt,
      },
    });

    // Envoyer le SMS (best-effort) — le code est toujours retourné dans la réponse API
    const message = this.formatSmsMessage(code, purpose, expiryMinutes);
    this.logger.log(`📱 OTP pour ${phone} [${purpose}]: ${code}`);

    try {
      await this.sendSms(phone, message);
    } catch (error) {
      // SMS non envoyé : le code reste accessible via la réponse API (mode test)
      this.logger.warn(`SMS non envoyé à ${phone}, OTP exposé via la réponse API`);
    }

    return code;
  }

  /**
   * Vérifie un OTP
   */
  async verifyOtp(phone: string, code: string, purpose: string): Promise<boolean> {
    const otp = await this.prisma.oTPCode.findFirst({
      where: {
        phone,
        code,
        purpose,
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      // Incrémenter les tentatives
      await this.prisma.oTPCode.updateMany({
        where: { phone, purpose, isUsed: false },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    // Marquer comme utilisé
    await this.prisma.oTPCode.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    return true;
  }

  private formatSmsMessage(code: string, purpose: string, expiryMinutes: number): string {
    const messages: Record<string, string> = {
      REGISTER: `ColiSN - Votre code d'inscription est : ${code}. Valable ${expiryMinutes} min.`,
      LOGIN: `ColiSN - Votre code de connexion est : ${code}. Valable ${expiryMinutes} min.`,
      DELIVERY: `ColiSN - Code de livraison : ${code}. À communiquer uniquement lors de la remise du colis.`,
      RESET: `ColiSN - Votre code de réinitialisation est : ${code}. Valable ${expiryMinutes} min.`,
    };
    return messages[purpose] || `ColiSN - Votre code est : ${code}. Valable ${expiryMinutes} min.`;
  }

  private async sendSms(to: string, message: string): Promise<void> {
    const apiKey = this.configService.get<string>('AFRICAS_TALKING_API_KEY');
    const username = this.configService.get<string>('AFRICAS_TALKING_USERNAME');
    if (!apiKey || !username) {
      throw new Error('Africa\'s Talking non configuré (API_KEY/USERNAME manquants)');
    }
    const sms = this.at.SMS;
    await sms.send({ to, message, from: 'ColiSN' });
  }
}
