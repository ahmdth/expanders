import { Module } from '@nestjs/common';
import { NewMatchMail } from './new-match.mail.js';
import { NotificationsService } from './notifications.service.js';

@Module({ providers: [NewMatchMail, NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
