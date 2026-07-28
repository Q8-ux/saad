import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(private prisma:PrismaService, private jwt:JwtService){}
  async login(dto:{companyId:string;email:string;password:string}){
    const user=await this.prisma.user.findUnique({where:{companyId_email:{companyId:dto.companyId,email:dto.email.toLowerCase()}}});
    if(!user?.isActive || !(await bcrypt.compare(dto.password,user.passwordHash))) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    const accessToken=await this.jwt.signAsync({sub:user.id,companyId:user.companyId,role:user.role});
    return {accessToken,user:{id:user.id,email:user.email,role:user.role,companyId:user.companyId}};
  }
}
