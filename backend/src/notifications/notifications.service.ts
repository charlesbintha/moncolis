import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '../common/prisma/prisma-client';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const serviceAccount = JSON.parse(
        this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_KEY', '{}'),
      );

      if (serviceAccount.project_id) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('✅ Firebase initialisé');
      } else {
        this.logger.warn('⚠️  Firebase non configuré (notifications push désactivées)');
      }
    } catch (error) {
      this.logger.warn(`Firebase init error: ${error.message}`);
    }
  }

  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    // Persister la notification
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data,
      },
    });

    // Envoyer la notification push (Firebase)
    await this.sendPushNotification(userId, title, body, data);

    return notification;
  }

  async sendBulkNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    await Promise.allSettled(
      userIds.map((userId) => this.sendNotification(userId, type, title, body, data)),
    );
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!this.firebaseApp) return;

    // TODO: Récupérer le token FCM de l'utilisateur depuis la DB
    // Pour l'instant, on log juste
    this.logger.debug(`[PUSH] → ${userId}: ${title}`);
  }

  async getMyNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { data: notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markAsRead(userId: string, notificationIds: string[]) {
    await this.prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'Notifications marquées comme lues' };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'Toutes les notifications marquées comme lues' };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
