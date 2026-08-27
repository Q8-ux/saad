import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsUUID() companyId!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
}

class CompanyEmailDto {
  @IsUUID() companyId!: string;
  @IsEmail() email!: string;
}

class EmailDto {
  @IsEmail() email!: string;
}

class InviteDto {
  @IsEmail() email!: string;
  @IsIn(Object.values(Role)) role!: Role;
  @IsOptional() @IsUUID() employeeId?: string;
}

class TokenPasswordDto {
  @IsString() @MinLength(20) @MaxLength(4096) token!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'))
  users(@Req() req: any) {
    return this.auth.listUsers(this.actor(req));
  }

  @Post('invitations')
  @UseGuards(AuthGuard('jwt'))
  invite(@Req() req: any, @Body() dto: InviteDto) {
    return this.auth.invite(this.actor(req), dto);
  }

  @Post('invitations/resend')
  @UseGuards(AuthGuard('jwt'))
  resendActivationForAdmin(@Req() req: any, @Body() dto: EmailDto) {
    return this.auth.resendActivationForAdmin(this.actor(req), dto.email);
  }

  @Get('email-status')
  @UseGuards(AuthGuard('jwt'))
  emailStatus(@Req() req: any) {
    return this.auth.emailStatus(this.actor(req));
  }

  @Post('request-activation')
  @HttpCode(HttpStatus.ACCEPTED)
  requestActivation(@Body() dto: CompanyEmailDto) {
    return this.auth.requestActivation(dto);
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  activate(@Body() dto: TokenPasswordDto) {
    return this.auth.activate(dto.token, dto.password);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: CompanyEmailDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: TokenPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  private actor(req: any) {
    return { companyId: req.user.companyId, userId: req.user.userId ?? req.user.sub, role: req.user.role as Role };
  }
}
