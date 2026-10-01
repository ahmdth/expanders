import { InMemoryMailTransport, MailModule, MailSmtpError } from '@nestjs/mail';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NewMatchMail } from './new-match.mail.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService (@nestjs/mail with the in-memory transport)', () => {
  const mailbox = new InMemoryMailTransport();
  let moduleRef: TestingModule, notifications: NotificationsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        MailModule.forRoot({
          transport: mailbox,
          from: 'Expanders360 <no-reply@expanders360.com>',
        }),
      ],
      providers: [NewMatchMail, NotificationsService],
    }).compile();
    await moduleRef.init();
    notifications = moduleRef.get(NotificationsService);
  });
  afterAll(() => moduleRef.close());
  beforeEach(() => mailbox.clear());

  it('emails the client about a new match', async () => {
    await notifications.notifyNewMatch('founder@acme.io', {
      projectId: 4,
      country: 'DE',
      vendorName: 'Berlin Partners',
      score: 11.5,
    });

    const mail = mailbox.assertSent({
      to: 'founder@acme.io',
      mail: NewMatchMail,
    });
    expect(mail.subject).toBe('New vendor match for your DE expansion project');
    expect(mail.html).toContain('Berlin Partners');
    expect(mail.text).toContain('project #4');
    expect(mail.text).toContain('11.5');
  });

  it('escapes vendor names (user data) in the HTML body', async () => {
    await notifications.notifyNewMatch('founder@acme.io', {
      projectId: 1,
      country: 'DE',
      vendorName: '<script>alert(1)</script>',
      score: 5,
    });
    const { html } = mailbox.assertSent({ to: 'founder@acme.io' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('swallows delivery failures so matching never breaks', async () => {
    mailbox.failNext(
      new MailSmtpError('RCPT TO', { code: 550, text: 'User unknown' }),
    );
    await expect(
      notifications.notifyNewMatch('ghost@acme.io', {
        projectId: 1,
        country: 'DE',
        vendorName: 'V',
        score: 1,
      }),
    ).resolves.toBeUndefined();
    mailbox.assertNotSent();
  });
});
