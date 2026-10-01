import { ConfigService } from '@nestjs/config';
import {
  FileMailTransport,
  LogMailTransport,
  SmtpTransport,
  type MailTransport,
} from '@nestjs/mail';

type StartTls = 'required' | 'opportunistic' | 'never';

/**
 * Picks the transport from MAIL_TRANSPORT:
 *   log  (default) – mock: only logs the mail, nothing is sent
 *   file           – writes .eml files to MAIL_DIRECTORY
 *   smtp           – real SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_STARTTLS)
 * Misconfiguration fails at startup, naming the variable.
 */
export function mailTransport(config: ConfigService): MailTransport {
  const kind = config.get<string>('MAIL_TRANSPORT') || 'log';
  switch (kind) {
    case 'log':
      return new LogMailTransport();
    case 'file':
      return new FileMailTransport({
        directory: config.get<string>('MAIL_DIRECTORY') || 'var/mail',
      });
    case 'smtp': {
      const host = config.get<string>('SMTP_HOST');
      if (!host)
        throw new Error('SMTP_HOST is required when MAIL_TRANSPORT is "smtp"');
      const user = config.get<string>('SMTP_USER');
      return new SmtpTransport({
        host,
        port: Number(config.get<string>('SMTP_PORT') || 587),
        // 'never' for a local catch-all such as MailHog; keep 'required' (default) for real providers
        ...(config.get<string>('SMTP_STARTTLS') && {
          startTls: config.get<string>('SMTP_STARTTLS') as StartTls,
        }),
        ...(user && {
          auth: { user, pass: config.get<string>('SMTP_PASS') ?? '' },
        }),
        pool: true,
      });
    }
    default:
      throw new Error(
        `MAIL_TRANSPORT must be "log", "file" or "smtp" (got "${kind}")`,
      );
  }
}
