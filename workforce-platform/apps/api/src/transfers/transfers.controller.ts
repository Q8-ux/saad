import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransferLocationEventType, TransferPermitStatus } from '@prisma/client';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { distanceMeters, evaluateLocationRisk } from '../common/geo';
import { PrismaService } from '../prisma/prisma.service';

class CreateTransferDto {
  @IsUUID() employeeId!: string;
  @IsUUID() originStationId!: string;
  @IsUUID() destinationStationId!: string;
  @IsString() reason!: string;
  @IsDateString() validFrom!: string;
  @IsDateString() validUntil!: string;
  @IsOptional() @IsNumber() @Min(0) expectedDurationMinutes?: number;
}

class LocationEventDto {
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsNumber() @Min(0) accuracyM!: number;
  @IsDateString() locationTimestamp!: string;
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsBoolean() mockLocationDetected?: boolean;
  @IsOptional() @IsString() deviceIntegrity?: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('transfers')
export class TransfersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() req: any) {
    return this.prisma.transferPermit.findMany({
      where: { companyId: req.user.companyId },
      include: { employee: true, originStation: true, destinationStation: true, approvedBy: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateTransferDto) {
    if (dto.originStationId === dto.destinationStationId) {
      throw new BadRequestException('يجب اختيار منشأتين مختلفتين');
    }

    const [employee, origin, destination] = await Promise.all([
      this.prisma.employee.findFirst({ where: { id: dto.employeeId, companyId: req.user.companyId, isActive: true } }),
      this.prisma.station.findFirst({ where: { id: dto.originStationId, companyId: req.user.companyId, isActive: true } }),
      this.prisma.station.findFirst({ where: { id: dto.destinationStationId, companyId: req.user.companyId, isActive: true } }),
    ]);

    if (!employee || !origin || !destination) throw new BadRequestException('بيانات الموظف أو المنشآت غير صحيحة');
    if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
      throw new BadRequestException('إحداثيات إحدى المنشآت غير مكتملة');
    }

    const expectedDistanceKm = distanceMeters(
      { latitude: Number(origin.latitude), longitude: Number(origin.longitude) },
      { latitude: Number(destination.latitude), longitude: Number(destination.longitude) },
    ) / 1000;

    return this.prisma.transferPermit.create({
      data: {
        companyId: req.user.companyId,
        employeeId: dto.employeeId,
        originStationId: dto.originStationId,
        destinationStationId: dto.destinationStationId,
        reason: dto.reason,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        expectedDistanceKm,
        expectedDurationMinutes: dto.expectedDurationMinutes,
        status: TransferPermitStatus.PENDING_APPROVAL,
      },
      include: { employee: true, originStation: true, destinationStation: true },
    });
  }

  @Patch(':id/approve')
  async approve(@Req() req: any, @Param('id') id: string) {
    const permit = await this.prisma.transferPermit.findFirst({ where: { id, companyId: req.user.companyId } });
    if (!permit) throw new BadRequestException('التصريح غير موجود');

    return this.prisma.transferPermit.update({
      where: { id },
      data: {
        status: TransferPermitStatus.APPROVED,
        approvedByUserId: req.user.userId ?? req.user.id,
        approvedAt: new Date(),
      },
    });
  }

  @Post(':id/location')
  async processLocation(@Req() req: any, @Param('id') id: string, @Body() dto: LocationEventDto) {
    const permit = await this.prisma.transferPermit.findFirst({
      where: { id, companyId: req.user.companyId },
      include: { originStation: true, destinationStation: true },
    });
    if (!permit) throw new BadRequestException('التصريح غير موجود');
    if (![TransferPermitStatus.APPROVED, TransferPermitStatus.READY, TransferPermitStatus.DEPARTED, TransferPermitStatus.IN_TRANSIT, TransferPermitStatus.ARRIVED, TransferPermitStatus.AT_DESTINATION, TransferPermitStatus.RETURNING].includes(permit.status)) {
      throw new BadRequestException('التصريح غير فعال');
    }

    const now = new Date();
    if (now < permit.validFrom || now > permit.validUntil) throw new BadRequestException('التصريح خارج فترة الصلاحية');

    const originDistanceM = distanceMeters(
      { latitude: dto.latitude, longitude: dto.longitude },
      { latitude: Number(permit.originStation.latitude), longitude: Number(permit.originStation.longitude) },
    );
    const destinationDistanceM = distanceMeters(
      { latitude: dto.latitude, longitude: dto.longitude },
      { latitude: Number(permit.destinationStation.latitude), longitude: Number(permit.destinationStation.longitude) },
    );
    const locationAgeSeconds = Math.max(0, (Date.now() - new Date(dto.locationTimestamp).getTime()) / 1000);

    const targetStation = destinationDistanceM <= originDistanceM ? permit.destinationStation : permit.originStation;
    const targetDistanceM = Math.min(originDistanceM, destinationDistanceM);
    const risk = evaluateLocationRisk({
      distanceM: targetDistanceM,
      geofenceM: targetStation.geofenceM,
      accuracyM: dto.accuracyM,
      maxAccuracyM: targetStation.maxGpsAccuracyM,
      mockLocationDetected: dto.mockLocationDetected,
      deviceIntegrity: dto.deviceIntegrity,
      locationAgeSeconds,
    });

    if (dto.mockLocationDetected || dto.deviceIntegrity === 'FAILED') {
      await this.prisma.transferPermit.update({
        where: { id },
        data: { status: TransferPermitStatus.REVIEW_REQUIRED, riskScore: risk.score, riskReasons: risk.reasons },
      });
      throw new BadRequestException('تعذر اعتماد الموقع بسبب اشتباه بالتلاعب');
    }

    let eventType = TransferLocationEventType.TRANSIT_CHECK;
    let nextStatus = permit.status;
    const update: Record<string, unknown> = { riskScore: risk.score, riskReasons: risk.reasons };

    if ([TransferPermitStatus.APPROVED, TransferPermitStatus.READY].includes(permit.status) && originDistanceM > permit.originStation.geofenceM) {
      eventType = TransferLocationEventType.ORIGIN_EXIT;
      nextStatus = TransferPermitStatus.IN_TRANSIT;
      update.actualDepartureAt = now;
    } else if ([TransferPermitStatus.DEPARTED, TransferPermitStatus.IN_TRANSIT].includes(permit.status) && destinationDistanceM <= permit.destinationStation.geofenceM) {
      eventType = TransferLocationEventType.DESTINATION_ENTRY;
      nextStatus = TransferPermitStatus.ARRIVED;
      update.actualArrivalAt = now;
    } else if ([TransferPermitStatus.ARRIVED, TransferPermitStatus.AT_DESTINATION].includes(permit.status) && destinationDistanceM > permit.destinationStation.geofenceM) {
      eventType = TransferLocationEventType.DESTINATION_EXIT;
      nextStatus = TransferPermitStatus.RETURNING;
    } else if (permit.status === TransferPermitStatus.RETURNING && originDistanceM <= permit.originStation.geofenceM) {
      eventType = TransferLocationEventType.RETURN_ARRIVAL;
      nextStatus = TransferPermitStatus.COMPLETED;
      update.completedAt = now;
    }

    const [event, updatedPermit] = await this.prisma.$transaction([
      this.prisma.transferLocationEvent.create({
        data: {
          permitId: id,
          eventType,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracyM: dto.accuracyM,
          distanceFromStationM: targetDistanceM,
          deviceId: dto.deviceId,
          mockLocationDetected: dto.mockLocationDetected ?? false,
          deviceIntegrity: dto.deviceIntegrity,
          riskScore: risk.score,
          riskReasons: risk.reasons,
        },
      }),
      this.prisma.transferPermit.update({ where: { id }, data: { ...update, status: nextStatus } }),
    ]);

    return { event, permit: updatedPermit, originDistanceM, destinationDistanceM };
  }
}
