import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { isEmail } from 'class-validator';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { buildEmailHtml, buildEmailText, EmailTemplateInput } from './email.templates';

type SendEmailInput = EmailTemplateInput & {
  to: string | string[];
  subject: string;
};

@Injectable()
export class EmailService {
  private transporter?: Transporter;

  getStatus() {
    const from = process.env.EMAIL_FROM?.trim() || '';
    const fromAddress = this.mailbox(from);
    const configured = this.configurationErrors().length === 0;
    return {
      provider: (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase(),
      configured,
      fromDomain: isEmail(fromAddress) ? fromAddress.split('@').at(-1) : null,
      webAppUrlConfigured: Boolean(process.env.WEB_APP_URL?.trim()),
    };
  }

  assertConfigured() {
    const errors = this.configurationErrors();
    if (errors.length) {
      throw new ServiceUnavailableException(`خدمة البريد غير مكتملة الإعداد: ${errors.join('، ')}`);
    }
  }

  buildWebLink(path: string, token: string) {
    this.assertConfigured();
    const base = process.env.WEB_APP_URL!.trim().replace(/\/?$/, '/');
    const url = new URL(path.replace(/^\//, ''), base);
    url.searchParams.set('token', token);
    return url.toString();
  }

  async sendActivation(to: string, token: string) {
    const url = this.buildWebLink('activate/', token);
    return this.send({
      to,
      subject: 'تفعيل حسابك | Account activation',
      title: 'تفعيل حسابك',
      preheader: 'أكمل تفعيل حسابك وحدد كلمة مرور جديدة.',
      message: 'تم إنشاء حساب لك في منصة نطاق العمل. اضغط الزر أدناه لتأكيد بريدك وتحديد كلمة المرور. هذا رابط مؤقت ومخصص لحسابك.',
      action: { label: 'تفعيل الحساب', url },
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const url = this.buildWebLink('reset-password/', token);
    return this.send({
      to,
      subject: 'استعادة كلمة المرور | Password reset',
      title: 'استعادة كلمة المرور',
      preheader: 'رابط آمن لتعيين كلمة مرور جديدة.',
      message: 'وصلنا طلب لتعيين كلمة مرور جديدة لحسابك. اضغط الزر أدناه للمتابعة. هذا رابط مؤقت ومخصص للاستخدام مرة واحدة.',
      action: { label: 'تعيين كلمة مرور جديدة', url },
    });
  }

  async sendSystemNotification(to: string[], title: string, message: string) {
    return this.send({
      to,
      subject: title,
      title,
      message,
      footer: 'أُرسلت هذه الرسالة من مركز تنبيهات منصة نطاق العمل.',
    });
  }

  private configurationErrors() {
    const errors: string[] = [];
    const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
    if (provider !== 'smtp') errors.push('EMAIL_PROVIDER يجب أن يكون smtp');
    if (!process.env.SMTP_HOST?.trim()) errors.push('SMTP_HOST');
    const from = process.env.EMAIL_FROM?.trim() || '';
    if (!from || /[\r\n]/.test(from) || !isEmail(this.mailbox(from))) errors.push('EMAIL_FROM');
    const replyTo = process.env.EMAIL_REPLY_TO?.trim();
    if (replyTo && (/[\r\n]/.test(replyTo) || !isEmail(this.mailbox(replyTo)))) errors.push('EMAIL_REPLY_TO');
    const webAppUrl = process.env.WEB_APP_URL?.trim();
    if (!webAppUrl || !this.isHttpUrl(webAppUrl)) errors.push('WEB_APP_URL');
    const hasUser = Boolean(process.env.SMTP_USER?.trim());
    const hasPassword = Boolean(process.env.SMTP_PASSWORD?.trim());
    if (hasUser !== hasPassword) errors.push('SMTP_USER وSMTP_PASSWORD يجب ضبطهما معاً');
    const port = Number(process.env.SMTP_PORT || 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('SMTP_PORT');
    for (const name of ['SMTP_SECURE', 'SMTP_REQUIRE_TLS'] as const) {
      const value = process.env[name]?.trim().toLowerCase();
      if (value && !['true', 'false'].includes(value)) errors.push(`${name} يجب أن يكون true أو false`);
    }
    return errors;
  }

  private mailbox(value: string) {
    const match = value.match(/<([^<>]+)>\s*$/);
    return (match?.[1] || value).trim().toLowerCase();
  }

  private isHttpUrl(value: string) {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }

  private getTransporter() {
    this.assertConfigured();
    if (this.transporter) return this.transporter;

    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const password = process.env.SMTP_PASSWORD;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure: process.env.SMTP_SECURE?.trim().toLowerCase() === 'true' || port === 465,
      requireTLS: process.env.SMTP_REQUIRE_TLS?.trim().toLowerCase() !== 'false' && port !== 465,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      auth: user && password ? { user, pass: password } : undefined,
      tls: { minVersion: 'TLSv1.2' },
    });
    return this.transporter;
  }

  private async send(input: SendEmailInput) {
    const recipients = (Array.isArray(input.to) ? input.to : [input.to])
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (!recipients.length) throw new ServiceUnavailableException('لا يوجد مستلم صالح للبريد.');

    const info = await this.getTransporter().sendMail({
      from: process.env.EMAIL_FROM!.trim(),
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
      to: recipients.length === 1 ? recipients[0] : process.env.EMAIL_FROM!.trim(),
      bcc: recipients.length > 1 ? recipients : undefined,
      subject: input.subject.replace(/[\r\n]+/g, ' ').trim(),
      text: buildEmailText(input),
      html: buildEmailHtml(input),
    });

    if (!info.messageId) throw new Error('لم يُرجع مزود البريد معرّفاً للرسالة.');

    const recipientSet = new Set(recipients);
    const rejectedRecipients = Array.isArray(info.rejected)
      ? info.rejected
          .map((recipient: unknown) => typeof recipient === 'string' ? recipient : (recipient as { address?: string })?.address || '')
          .map((recipient: string) => recipient.trim().toLowerCase())
          .filter((recipient: string) => recipientSet.has(recipient))
      : [];
    const rejected = new Set(rejectedRecipients).size;
    const accepted = recipients.length - rejected;
    if (accepted === 0) throw new Error('رفض مزود البريد جميع المستلمين.');

    return { messageId: info.messageId, accepted, rejected };
  }
}
