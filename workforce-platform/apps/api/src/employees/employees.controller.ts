import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
class CreateEmployeeDto { @IsString() employeeNo!:string; @IsString() fullNameAr!:string; @IsOptional() @IsString() fullNameEn?:string; @IsOptional() @IsString() department?:string; @IsOptional() @IsString() jobTitle?:string; }
@UseGuards(AuthGuard('jwt')) @Controller('employees')
export class EmployeesController { constructor(private prisma:PrismaService){} @Get() list(@Req() req:any){return this.prisma.employee.findMany({where:{companyId:req.user.companyId},orderBy:{createdAt:'desc'}});} @Post() create(@Req() req:any,@Body() dto:CreateEmployeeDto){return this.prisma.employee.create({data:{...dto,companyId:req.user.companyId}});} }
