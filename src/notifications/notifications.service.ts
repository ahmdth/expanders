import { Injectable, Logger } from '@nestjs/common';
import { Mailer } from '@nestjs/mail';
import { NewMatch, NewMatchMail } from './new-match.mail.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private mailer: Mailer) {}

  /** Notification failures must never break matching, so errors are logged, not thrown. */
  async notifyNewMatch(to: string, match: NewMatch) {
    try {
      await this.mailer.send(NewMatchMail, { to, data: match });
    } catch (e) {
      this.logger.error(`Failed to email ${to} about project ${match.projectId}: ${(e as Error).message}`);
    }
  }
}
