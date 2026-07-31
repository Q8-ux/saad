import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceDecision, AttendanceType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { distanceMeters, evaluateLocationRisk } from '../common/geo';
import { PrismaService } from '../prisma/prisma.service';

class PunchDto {
  @IsUUID() employeeId!: string;
  @IsUUID() stationId!: string;
  @IsEnum(AttendanceType) type!: AttendanceType;
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsNumber() @Min(0) accuracyM!: number;
  @IsDateString() locationTimestamp!: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsBoolean() mockLocationDetected?: boolean;
  @IsOptional() @IsString() deviceIntegrity?: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() req: any) {
    return this.prisma.attendance.findMany({
      where: { companyId: req.user.companyId },
      include: { employee: true, station: true },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
  }

  @Post('punch')
  async punch(@Req() req: any, @Body() dto: PunchDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId: req.user.companyId, isActive: true },
    });
    if (!employee) throw new BadRequestException('الموظف غير موجود');

    const station = await this.prisma.station.findFirst({
      where: { id: dto.stationId, companyId: req.user.companyId, isActive: true },
    });
    if (!station?.latitude || !station.longitude) {
      throw new BadRequestException('إحداثيات المنشأة غير مكتملة');
    }

    const locationTimestamp = new Date(dto.locationTimestamp);
    const locationAgeSeconds = Math.max(0, (Date.now() - locationTimestamp.getTime()) / 1000);
    const distanceM = distanceMeters(
      { latitude: dto.latitude, longitude: dto.longitude },
      { latitude: Number(station.latitude), longitude: Number(station.longitude) },
    );

    const risk = evaluateLocationRisk({
      distanceM,
      geofenceM: station.geofenceM,
      accuracyM: dto.accuracyM,
      maxAccuracyM: station.maxGpsAccuracyM,
      mockLocationDetected: dto.mockLocationDetected,
      deviceIntegrity: dto.deviceIntegrity,
      locationAgeSeconds,
    });

    let decision: AttendanceDecision = AttendanceDecision.ACCEPTED;
    let rejectionReason: string | undefined;

    if (dto.mockLocationDetected || dto.deviceIntegrity === 'FAILED') {
      decision = AttendanceDecision.REJECTED;
      rejectionReason = 'تعذر اعتماد العملية بسبب عدم موثوقية الموقع أو الجهاز';
    } else if (distanceM > station.geofenceM) {
      decision = AttendanceDecision.REJECTED;
      rejectionReason = `أنت خارج النطاق الجغرافي بمسافة ${Math.round(distanceM)} متر`;
    } else if (dto.accuracyM > station.maxGpsAccuracyM || locationAgeSeconds > 120) {
      decision = AttendanceDecision.REVIEW_REQUIRED;
      rejectionReason = 'تم حفظ المحاولة للمراجعة بسبب ضعف أو قدم قراءة الموقع';
    } else if (risk.score >= 30) {
      decision = AttendanceDecision.ACCEPTED_WITH_WARNING;
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        companyId: req.user.companyId,
        employeeId: dto.employeeId,
        stationId: dto.stationId,
        type: dto.type,
        decision,
        locationTimestamp,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyM: dto.accuracyM,
        distanceFromStationM: distanceM,
        geofenceRadiusM: station.geofenceM,
        deviceId: dto.deviceId,
        mockLocationDetected: dto.mockLocationDetected ?? false,
        deviceIntegrity: dto.deviceIntegrity,
        riskScore: risk.score,
        riskReasons: risk.reasons,
        rejectionReason,
      },
      include: { employee: true, station: true },
    });

    if (decision === AttendanceDecision.REJECTED) {
      throw new BadRequestException({ message: rejectionReason, attendanceId: attendance.id, riskScore: risk.score });
    }

    return attendance;
  }
}
