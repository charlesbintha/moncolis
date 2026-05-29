import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { winstonConfig } from './common/utils/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3001');

  // CORS
  const isDev = configService.get('NODE_ENV', 'development') !== 'production';
  app.enableCors({
    origin: isDev
      ? (origin, callback) => callback(null, true) // En dev : tout localhost accepté
      : frontendUrl.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  });

  // Prefix global
  app.setGlobalPrefix('api/v1');

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Supprimer les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // Rejeter les requêtes avec champs inconnus
      transform: true,            // Transformer automatiquement les types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtre d'exceptions global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Intercepteurs globaux
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new ResponseInterceptor(),
  );

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ColiSN API')
    .setDescription(
      `## Application de covoiturage de colis pour le Sénégal

API REST pour ColiSN - met en relation expéditeurs et transporteurs au Sénégal.

### Authentification
Utiliser le header \`Authorization: Bearer <access_token>\`

### Monnaie
Tous les montants sont en **FCFA** (entiers, sans décimales)

### Téléphone
Format sénégalais : \`+221XXXXXXXXX\` (9 chiffres après l'indicatif)`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Access Token JWT (expire en 15 min)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentification & gestion des tokens')
    .addTag('users', 'Profils utilisateurs')
    .addTag('trips', 'Annonces de trajets (transporteurs)')
    .addTag('parcels', 'Demandes de colis (expéditeurs)')
    .addTag('bookings', 'Réservations')
    .addTag('payments', 'Paiements & Wallet')
    .addTag('reviews', 'Évaluations')
    .addTag('disputes', 'Litiges')
    .addTag('admin', 'Administration')
    .addTag('notifications', 'Notifications')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════╗
║           ColiSN Backend API                 ║
║    Covoiturage de colis - Sénégal            ║
╠══════════════════════════════════════════════╣
║  🚀 Serveur    : http://localhost:${port}       ║
║  📚 Swagger    : http://localhost:${port}/api/docs ║
║  🌍 Env        : ${configService.get('NODE_ENV', 'development')}               ║
╚══════════════════════════════════════════════╝
  `);
}

bootstrap();
