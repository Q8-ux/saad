import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NotificationsService } from './notifications.service';

const roles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'SUPERVISOR'];

class QueueDto {
  @IsIn(['APP', 'WHATSAPP', 'EMAIL']) channel!: 'APP' | 'WHATSAPP' | 'EMAIL';
  @IsOptional() @IsIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']) priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  @IsOptional() @IsIn(['ROLE', 'EMPLOYEE', 'STATION', 'ALL', 'DIRECT']) recipientType?: 'ROLE' | 'EMPLOYEE' | 'STATION' | 'ALL' | 'DIRECT';
  @IsOptional() @IsString() @MaxLength(320) recipientValue?: string;
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @IsString() @MinLength(3) @MaxLength(4000) message!: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@Req() req: any) {
    this.guard(req);
    return this.service.list(req.user.companyId);
  }

  @Post()
  queue(@Req() req: any, @Body() dto: QueueDto) {
    this.guard(req);
    return this.service.queue({ companyId: req.user.companyId, userId: req.user.userId ?? req.user.sub }, dto);
  }

  @Post(':id/retry')
  retry(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.guard(req);
    return this.service.retry({ companyId: req.user.companyId, userId: req.user.userId ?? req.user.sub }, id);
  }

  private guard(req: any) {
    if (!roles.includes(req.user.role)) throw new ForbiddenException('ليست لديك صلاحية إدارة التنبيهات');
  }
}
