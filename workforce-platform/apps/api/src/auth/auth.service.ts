import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokenService } from './auth-token.service';

type Actor = { companyId: string; userId: string; role: Role };
type InviteInput = { email: string; role: Role; employeeId?: string };

const GENERIC_PASSWORD_RESPONSE = 'إذا كان الحساب موجوداً فسيصل رابط الاستعادة إلى بريده الإلكتروني.';
const GENERIC_ACTIVATION_RESPONSE = 'إذا كان الحساب بانتظار التفعيل فسيصل رابط جديد إلى بريده الإلكتروني.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly requestCooldowns = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly tokens: AuthTokenService,
  ) {}

  async login(dto: { companyId: string; email: string; password: string }) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { companyId_email: { companyId: dto.companyId, email } } });
    if (!user?.isActive || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id, companyId: user.companyId, role: user.role, email: user.email });
    return { accessToken, user: { id: user.id, email: user.email, role: user.role, companyId: user.companyId } };
  }

  async listUsers(actor: Actor) {
    this.assertAdmin(actor);
    return this.prisma.user.findMany({
      where: { companyId: actor.companyId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        employee: { select: { id: true, fullNameAr: true, employeeNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(actor: Actor, dto: InviteInput) {
    this.assertAdmin(actor, dto.role);
    this.email.assertConfigured();
    this.tokens.assertConfigured();
    const email = this.normalizeEmail(dto.email);

    if (dto.employeeId) {
      const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, companyId: actor.companyId } });
      if (!employee) throw new NotFoundException('الموظف غير موجود ضمن الجهة.');
      if (employee.userId) throw new ConflictException('الموظف مرتبط بحساب مسبقاً.');
    }

    const existing = await this.prisma.user.findUnique({ where: { companyId_email: { companyId: actor.companyId, email } } });
    if (existing?.isActive) throw new ConflictException('يوجد حساب نشط بهذا البريد.');

    const randomPasswordHash = await bcrypt.hash(randomBytes(48).toString('base64url'), 12);
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            role: dto.role,
            passwordHash: randomPasswordHash,
            passwordChangedAt: new Date(),
            isActive: false,
            employee: dto.employeeId ? { connect: { id: dto.employeeId } } : undefined,
          },
        })
      : await this.prisma.user.create({
          data: {
            companyId: actor.companyId,
            email,
            role: dto.role,
            passwordHash: randomPasswordHash,
            isActive: false,
            employee: dto.employeeId ? { connect: { id: dto.employeeId } } : undefined,
          },
        });

    try {
      await this.sendActivation(user);
    } catch (error) {
      this.logger.error(`Invitation email delivery failed for user ${user.id}`, error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('تم إنشاء الحساب، لكن تعذر إرسال رسالة التفعيل. راجع إعداد SMTP ثم أعد الإرسال.');
    }
    return { id: user.id, email: user.email, role: user.role, isActive: user.isActive, activationSent: true };
  }

  async resendActivationForAdmin(actor: Actor, emailInput: string) {
    this.assertAdmin(actor);
    this.email.assertConfigured();
    this.tokens.assertConfigured();
    const user = await this.prisma.user.findUnique({
      where: { companyId_email: { companyId: actor.companyId, email: this.normalizeEmail(emailInput) } },
    });
    if (!user || user.isActive) throw new BadRequestException('الحساب غير موجود أو تم تفعيله مسبقاً.');
    const refreshed = await this.prisma.user.update({ where: { id: user.id }, data: { passwordChangedAt: new Date() } });
    try {
      await this.sendActivation(refreshed);
    } catch (error) {
      this.logger.error(`Activation resend failed for user ${user.id}`, error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('تعذر إرسال رسالة التفعيل. تحقق من إعداد SMTP.');
    }
    return { activationSent: true };
  }

  async requestActivation(dto: { companyId: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { companyId_email: { companyId: dto.companyId, email: this.normalizeEmail(dto.email) } },
    });
    if (user && !user.isActive && this.allowPublicEmail('activation', user.companyId, user.email) && this.email.getStatus().configured && this.tokens.isConfigured()) {
      void this.refreshAndSendActivation(user.id).catch((error) => {
        this.logger.error(`Activation email delivery failed for user ${user.id}`, error instanceof Error ? error.stack : undefined);
      });
    }
    return { message: GENERIC_ACTIVATION_RESPONSE };
  }

  async activate(token: string, password: string) {
    const claims = await this.tokens.verify(token, 'ACCOUNT_ACTIVATION');
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub } });
    if (
      !user ||
      user.companyId !== claims.companyId ||
      user.isActive ||
      claims.passwordVersion !== this.passwordVersion(user.passwordChangedAt)
    ) {
      throw new BadRequestException('الرابط غير صالح أو تم استخدامه مسبقاً.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, isActive: true, failedAttempts: 0, lockedUntil: null, passwordChangedAt: new Date() },
    });
    return { message: 'تم تفعيل الحساب. يمكنك تسجيل الدخول الآن.' };
  }

  async forgotPassword(dto: { companyId: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { companyId_email: { companyId: dto.companyId, email: this.normalizeEmail(dto.email) } },
    });
    if (user?.isActive && this.allowPublicEmail('reset', user.companyId, user.email) && this.email.getStatus().configured && this.tokens.isConfigured()) {
      void this.issueAndSendPasswordReset(user).catch((error) => {
        this.logger.error(`Password reset email delivery failed for user ${user.id}`, error instanceof Error ? error.stack : undefined);
      });
    }
    return { message: GENERIC_PASSWORD_RESPONSE };
  }

  async resetPassword(token: string, password: string) {
    const claims = await this.tokens.verify(token, 'PASSWORD_RESET');
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub } });
    if (
      !user?.isActive ||
      user.companyId !== claims.companyId ||
      claims.passwordVersion !== this.passwordVersion(user.passwordChangedAt)
    ) {
      throw new BadRequestException('الرابط غير صالح أو تم استخدامه مسبقاً.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedAttempts: 0, lockedUntil: null, passwordChangedAt: new Date() },
    });
    return { message: 'تم تحديث كلمة المرور بنجاح.' };
  }

  emailStatus(actor: Actor) {
    this.assertAdmin(actor);
    return { ...this.email.getStatus(), tokenSigningConfigured: this.tokens.isConfigured() };
  }

  private async sendActivation(user: { id: string; companyId: string; email: string; passwordChangedAt: Date }) {
    const token = await this.tokens.issueActivation({
      sub: user.id,
      companyId: user.companyId,
      passwordVersion: this.passwordVersion(user.passwordChangedAt),
    });
    await this.email.sendActivation(user.email, token);
  }

  private async refreshAndSendActivation(userId: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { passwordChangedAt: new Date() } });
    await this.sendActivation(user);
  }

  private async issueAndSendPasswordReset(user: { id: string; companyId: string; email: string; passwordChangedAt: Date }) {
    const token = await this.tokens.issuePasswordReset({
      sub: user.id,
      companyId: user.companyId,
      passwordVersion: this.passwordVersion(user.passwordChangedAt),
    });
    await this.email.sendPasswordReset(user.email, token);
  }

  private assertAdmin(actor: Actor, invitedRole?: Role) {
    const administrativeRoles: Role[] = [Role.SUPER_ADMIN, Role.COMPANY_ADMIN];
    if (!administrativeRoles.includes(actor.role)) {
      throw new ForbiddenException('ليست لديك صلاحية إدارة حسابات المستخدمين.');
    }
    if (actor.role !== Role.SUPER_ADMIN && invitedRole === Role.SUPER_ADMIN) {
      throw new ForbiddenException('إنشاء مدير عام يتطلب صلاحية المدير العام.');
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private passwordVersion(value: Date) {
    return value.getTime();
  }

  private allowPublicEmail(purpose: string, companyId: string, email: string) {
    const now = Date.now();
    const key = `${purpose}:${companyId}:${this.normalizeEmail(email)}`;
    const previous = this.requestCooldowns.get(key) || 0;
    if (now - previous < 60_000) return false;
    this.requestCooldowns.set(key, now);
    if (this.requestCooldowns.size > 5_000) {
      for (const [entry, timestamp] of this.requestCooldowns) {
        if (now - timestamp > 3_600_000) this.requestCooldowns.delete(entry);
      }
    }
    return true;
  }
}
