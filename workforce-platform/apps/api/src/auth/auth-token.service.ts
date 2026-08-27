import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

export type EmailTokenPurpose = 'ACCOUNT_ACTIVATION' | 'PASSWORD_RESET';

export type EmailTokenClaims = {
  sub: string;
  companyId: string;
  purpose: EmailTokenPurpose;
  passwordVersion?: number;
};

@Injectable()
export class AuthTokenService {
  private readonly issuer = 'workforce-platform-api';
  private readonly audience = 'workforce-platform-web';

  constructor(private readonly jwt: JwtService) {}

  isConfigured() {
    return Boolean(process.env.EMAIL_TOKEN_SECRET?.trim() && process.env.EMAIL_TOKEN_SECRET!.trim().length >= 32);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('EMAIL_TOKEN_SECRET يجب أن يحتوي على 32 حرفاً عشوائياً على الأقل.');
    }
  }

  issueActivation(input: Omit<EmailTokenClaims, 'purpose'>) {
    return this.issue({ ...input, purpose: 'ACCOUNT_ACTIVATION' }, this.ttl('EMAIL_ACTIVATION_TTL_SECONDS', 86_400, 3_600, 604_800));
  }

  issuePasswordReset(input: Omit<EmailTokenClaims, 'purpose'>) {
    return this.issue({ ...input, purpose: 'PASSWORD_RESET' }, this.ttl('EMAIL_RESET_TTL_SECONDS', 1_800, 300, 86_400));
  }

  async verify(token: string, purpose: EmailTokenPurpose) {
    this.assertConfigured();
    try {
      const claims = await this.jwt.verifyAsync<EmailTokenClaims>(token, {
        secret: process.env.EMAIL_TOKEN_SECRET!.trim(),
        issuer: this.issuer,
        audience: this.audience,
      });
      if (claims.purpose !== purpose || !claims.sub || !claims.companyId) {
        throw new Error('Invalid token claims');
      }
      return claims;
    } catch {
      throw new BadRequestException('الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.');
    }
  }

  private issue(claims: EmailTokenClaims, expiresIn: number) {
    this.assertConfigured();
    return this.jwt.signAsync(claims, {
      secret: process.env.EMAIL_TOKEN_SECRET!.trim(),
      issuer: this.issuer,
      audience: this.audience,
      expiresIn,
      jwtid: randomUUID(),
    });
  }

  private ttl(name: string, fallback: number, min: number, max: number) {
    const value = Number(process.env[name] || fallback);
    return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
  }
}
