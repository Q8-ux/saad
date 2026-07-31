import {Body,Controller,Get,Post,Req,UseGuards,ForbiddenException} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {IsIn,IsOptional,IsString,MaxLength,MinLength} from 'class-validator';
import {NotificationsService} from './notifications.service';
const roles=['SUPER_ADMIN','COMPANY_ADMIN','HR_MANAGER','SUPERVISOR'];
class QueueDto{@IsIn(['APP','WHATSAPP','EMAIL']) channel!:string;@IsOptional()@IsIn(['LOW','NORMAL','HIGH','CRITICAL']) priority?:string;@IsOptional()@IsString() recipientType?:string;@IsOptional()@IsString() recipientValue?:string;@IsString()@MinLength(2)@MaxLength(160) title!:string;@IsString()@MinLength(3)@MaxLength(4000) message!:string;}
@UseGuards(AuthGuard('jwt'))@Controller('notifications')
export class NotificationsController{constructor(private readonly service:NotificationsService){}private guard(req:any){if(!roles.includes(req.user.role))throw new ForbiddenException('ليست لديك صلاحية إدارة التنبيهات')}@Get()list(@Req()req:any){this.guard(req);return this.service.list(req.user.companyId)}@Post()queue(@Req()req:any,@Body()dto:QueueDto){this.guard(req);return this.service.queue({companyId:req.user.companyId,userId:req.user.userId??req.user.id},dto)}}
