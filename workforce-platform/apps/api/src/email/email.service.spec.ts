import assert from 'node:assert/strict';
import test from 'node:test';
import { EmailService } from './email.service';

const keys = ['EMAIL_PROVIDER', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM', 'WEB_APP_URL'] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

test.before(() => {
  process.env.EMAIL_PROVIDER = 'smtp';
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'mailer';
  process.env.SMTP_PASSWORD = 'not-a-real-secret';
  process.env.EMAIL_FROM = 'Platform <noreply@example.com>';
  process.env.WEB_APP_URL = 'https://q8-ux.github.io/saad/';
});

test.after(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test('reports readiness without returning SMTP credentials', () => {
  const status = new EmailService().getStatus();
  assert.equal(status.configured, true);
  assert.equal(status.provider, 'smtp');
  assert.equal(status.fromDomain, 'example.com');
  assert.doesNotMatch(JSON.stringify(status), /mailer|not-a-real-secret|smtp\.example\.com/);
});

test('builds a GitHub Pages activation URL without dropping the base path', () => {
  const url = new EmailService().buildWebLink('activate/', 'signed-token');
  assert.equal(url, 'https://q8-ux.github.io/saad/activate/?token=signed-token');
});

test('does not report success when SMTP rejects every recipient', async () => {
  const service = new EmailService();
  (service as any).transporter = {
    sendMail: async () => ({ messageId: 'smtp-message-id', accepted: [], rejected: ['user@example.com'] }),
  };

  await assert.rejects(
    () => service.sendSystemNotification(['user@example.com'], 'تنبيه', 'نص التنبيه'),
    /رفض مزود البريد جميع المستلمين/,
  );
});

test('counts only intended recipients in a partial bulk delivery', async () => {
  const service = new EmailService();
  (service as any).transporter = {
    sendMail: async () => ({
      messageId: 'smtp-message-id',
      accepted: ['noreply@example.com', 'first@example.com'],
      rejected: ['second@example.com'],
    }),
  };

  const result = await service.sendSystemNotification(
    ['first@example.com', 'second@example.com'],
    'تنبيه',
    'نص التنبيه',
  );
  assert.deepEqual(result, { messageId: 'smtp-message-id', accepted: 1, rejected: 1 });
});
