import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [PrismaModule, AuthModule, EmployeesModule, AttendanceModule, TransfersModule],
})
export class AppModule {}
