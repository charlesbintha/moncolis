import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendOtpDto, RegisterDto, LoginDto, RefreshTokenDto } from './dto/register.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --------------------------------------------------
  // ENVOI OTP INSCRIPTION
  // --------------------------------------------------
  @Post('send-register-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 600000, limit: 3 } }) // Max 3 SMS / 10 min
  @ApiOperation({ summary: 'Envoyer un OTP par SMS pour l\'inscription' })
  @ApiResponse({ status: 200, description: 'OTP envoyé avec succès' })
  @ApiResponse({ status: 409, description: 'Numéro déjà utilisé' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives' })
  async sendRegisterOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendRegisterOtp(dto.phone);
  }

  // --------------------------------------------------
  // ENVOI OTP CONNEXION
  // --------------------------------------------------
  @Post('send-login-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 600000, limit: 3 } })
  @ApiOperation({ summary: 'Envoyer un OTP par SMS pour la connexion' })
  @ApiResponse({ status: 200, description: 'OTP envoyé' })
  @ApiResponse({ status: 404, description: 'Compte introuvable' })
  async sendLoginOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendLoginOtp(dto.phone);
  }

  // --------------------------------------------------
  // INSCRIPTION
  // --------------------------------------------------
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un compte avec téléphone + OTP' })
  @ApiResponse({ status: 201, description: 'Compte créé, tokens retournés' })
  @ApiResponse({ status: 401, description: 'OTP invalide ou expiré' })
  @ApiResponse({ status: 409, description: 'Numéro déjà utilisé' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // --------------------------------------------------
  // CONNEXION
  // --------------------------------------------------
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter avec téléphone + OTP' })
  @ApiResponse({ status: 200, description: 'Connexion réussie, tokens retournés' })
  @ApiResponse({ status: 401, description: 'OTP invalide ou compte banni' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // --------------------------------------------------
  // REFRESH TOKEN
  // --------------------------------------------------
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler l\'access token via refresh token' })
  @ApiResponse({ status: 200, description: 'Nouveaux tokens générés' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se déconnecter (invalide le refresh token)' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  // --------------------------------------------------
  // UPLOAD CNI
  // --------------------------------------------------
  @Post('upload-cni')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 2))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Soumettre la pièce d\'identité (CNI recto/verso)',
    description: 'Uploader deux photos de la CNI (recto et verso). Validation manuelle par l\'admin requise.',
  })
  @ApiResponse({ status: 200, description: 'CNI soumise, en attente de validation' })
  async uploadCni(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length !== 2) {
      throw new Error('Veuillez uploader exactement 2 photos (recto et verso de la CNI)');
    }
    return this.authService.uploadCni(userId, files[0], files[1]);
  }
}
