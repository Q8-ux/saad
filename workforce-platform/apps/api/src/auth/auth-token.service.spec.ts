import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service';

const originalSecret = process.env.EMAIL_TOKEN_SECRET;
process.env.EMAIL_TOKEN_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';

test.after(() => {
  if (originalSecret === undefined) delete process.env.EMAIL_TOKEN_SECRET;
  else process.env.EMAIL_TOKEN_SECRET = originalSecret;
});

test('issues and verifies an account activation token', async () => {
  const service = new AuthTokenService(new JwtService());
  const token = await service.issueActivation({
    sub: 'user-1',
    companyId: 'company-1',
    passwordVersion: 123,
  });
  const claims = await service.verify(token, 'ACCOUNT_ACTIVATION');
  assert.equal(claims.sub, 'user-1');
  assert.equal(claims.purpose, 'ACCOUNT_ACTIVATION');
  assert.equal(Object.hasOwn(claims, 'email'), false);
});

test('rejects a token used for the wrong purpose', async () => {
  const service = new AuthTokenService(new JwtService());
  const token = await service.issueActivation({
    sub: 'user-1',
    companyId: 'company-1',
    passwordVersion: 123,
  });
  await assert.rejects(() => service.verify(token, 'PASSWORD_RESET'), BadRequestException);
});
