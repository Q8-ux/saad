import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from '../email/email.module';
@Module({imports:[PassportModule,EmailModule,JwtModule.register({secret:process.env.JWT_SECRET,signOptions:{expiresIn:'8h'}})],controllers:[AuthController],providers:[AuthService,AuthTokenService,JwtStrategy],exports:[JwtModule]})
export class AuthModule {}
