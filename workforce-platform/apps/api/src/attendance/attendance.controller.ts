import { Body, Controller, Get, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
class PunchDto { @IsUUID() employeeId!:string; @IsEnum(AttendanceType) type!:AttendanceType; @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?:number; @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?:number; @IsOptional() @IsNumber() accuracyM?:number; @IsOptional() @IsString() deviceId?:string; }
@UseGuards(AuthGuard('jwt')) @Controller('attendance')
export class AttendanceController { constructor(private prisma:PrismaService){} @Get() list(@Req() req:any){return this.prisma.attendance.findMany({where:{companyId:req.user.companyId},include:{employee:true},orderBy:{recordedAt:'desc'},take:200});} @Post('punch') async punch(@Req() req:any,@Body() dto:PunchDto){const employee=await this.prisma.employee.findFirst({where:{id:dto.employeeId,companyId:req.user.companyId,isActive:true}});if(!employee)throw new BadRequestException('الموظف غير موجود');return this.prisma.attendance.create({data:{companyId:req.user.companyId,employeeId:dto.employeeId,type:dto.type,latitude:dto.latitude,longitude:dto.longitude,accuracyM:dto.accuracyM,deviceId:dto.deviceId}});} }
