import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TransfersModule } from './transfers/transfers.module';
import { EmergencyModule } from './emergency/emergency.module';
import { StationsModule } from './stations/stations.module';
import { AiModule } from './ai/ai.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, EmployeesModule, AttendanceModule, TransfersModule, EmergencyModule, StationsModule, AiModule, NotificationsModule],
})
export class AppModule {}
