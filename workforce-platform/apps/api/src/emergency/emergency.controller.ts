import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmergencyStatus, EmergencyType, EvacuationStatus, SafeLocationType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class AssemblyPointDto {
  @IsUUID() stationId!: string;
  @IsString() code!: string;
  @IsString() nameAr!: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsOptional() @IsInt() @Min(10) geofenceM?: number;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
}

class ShelterDto extends AssemblyPointDto {
  @IsString() shelterType!: string;
}

class CriticalAssetDto {
  @IsUUID() stationId!: string;
  @IsString() code!: string;
  @IsString() nameAr!: string;
  @IsString() assetType!: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) riskLevel?: number;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

class IncidentDto {
  @IsUUID() stationId!: string;
  @IsEnum(EmergencyType) type!: EmergencyType;
  @IsString() titleAr!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) severity?: number;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

class EvacuationLocationDto {
  @IsUUID() employeeId!: string;
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsOptional() @IsNumber() accuracyM?: number;
}

function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@UseGuards(AuthGuard('jwt'))
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stations/:stationId/safe-locations')
  async safeLocations(@Req() req: any, @Param('stationId') stationId: string) {
    const station = await this.prisma.station.findFirst({ where: { id: stationId, companyId: req.user.companyId } });
    if (!station) throw new BadRequestException('المنشأة غير موجودة');
    const [assemblyPoints, shelters, criticalAssets] = await Promise.all([
      this.prisma.assemblyPoint.findMany({ where: { stationId, isActive: true } }),
      this.prisma.shelter.findMany({ where: { stationId, isActive: true } }),
      this.prisma.criticalAsset.findMany({ where: { stationId, isActive: true } }),
    ]);
    return { station, assemblyPoints, shelters, criticalAssets };
  }

  @Post('assembly-points')
  async createAssemblyPoint(@Req() req: any, @Body() dto: AssemblyPointDto) {
    await this.ensureStation(req.user.companyId, dto.stationId);
    return this.prisma.assemblyPoint.create({ data: dto });
  }

  @Post('shelters')
  async createShelter(@Req() req: any, @Body() dto: ShelterDto) {
    await this.ensureStation(req.user.companyId, dto.stationId);
    return this.prisma.shelter.create({ data: dto });
  }

  @Post('critical-assets')
  async createCriticalAsset(@Req() req: any, @Body() dto: CriticalAssetDto) {
    await this.ensureStation(req.user.companyId, dto.stationId);
    return this.prisma.criticalAsset.create({ data: dto });
  }

  @Get('incidents')
  listIncidents(@Req() req: any) {
    return this.prisma.emergencyIncident.findMany({
      where: { companyId: req.user.companyId },
      include: { station: true, evacuations: { include: { employee: true, assemblyPoint: true, shelter: true } } },
      orderBy: { activatedAt: 'desc' },
      take: 100,
    });
  }

  @Post('incidents')
  async activateIncident(@Req() req: any, @Body() dto: IncidentDto) {
    await this.ensureStation(req.user.companyId, dto.stationId);
    const incident = await this.prisma.emergencyIncident.create({
      data: {
        companyId: req.user.companyId,
        stationId: dto.stationId,
        createdByUserId: req.user.userId,
        type: dto.type,
        titleAr: dto.titleAr,
        description: dto.description,
        severity: dto.severity ?? 1,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
        user: { stationAccess: { some: { stationId: dto.stationId } } },
      },
      select: { id: true },
    });

    if (employees.length) {
      await this.prisma.emergencyEvacuation.createMany({
        data: employees.map((employee) => ({ incidentId: incident.id, employeeId: employee.id })),
        skipDuplicates: true,
      });
    }

    return this.prisma.emergencyIncident.findUnique({
      where: { id: incident.id },
      include: { station: true, evacuations: { include: { employee: true } } },
    });
  }

  @Post('incidents/:incidentId/close')
  async closeIncident(@Req() req: any, @Param('incidentId') incidentId: string) {
    const incident = await this.prisma.emergencyIncident.findFirst({ where: { id: incidentId, companyId: req.user.companyId } });
    if (!incident) throw new BadRequestException('الحادث غير موجود');
    return this.prisma.emergencyIncident.update({
      where: { id: incidentId },
      data: { status: EmergencyStatus.CLOSED, closedAt: new Date() },
    });
  }

  @Post('incidents/:incidentId/location')
  async updateEvacuationLocation(
    @Req() req: any,
    @Param('incidentId') incidentId: string,
    @Body() dto: EvacuationLocationDto,
  ) {
    const evacuation = await this.prisma.emergencyEvacuation.findFirst({
      where: { incidentId, employeeId: dto.employeeId, incident: { companyId: req.user.companyId, status: EmergencyStatus.ACTIVE } },
      include: { incident: true, assemblyPoint: true, shelter: true },
    });
    if (!evacuation) throw new BadRequestException('سجل الإخلاء غير موجود أو الحادث غير نشط');

    let status = evacuation.status;
    let arrivedAt = evacuation.arrivedAt;
    let riskScore = evacuation.riskScore;

    const destination = evacuation.destinationType === SafeLocationType.SHELTER ? evacuation.shelter : evacuation.assemblyPoint;
    if (destination) {
      const d = distanceM(dto.latitude, dto.longitude, Number(destination.latitude), Number(destination.longitude));
      if (d <= destination.geofenceM) {
        status = EvacuationStatus.SAFE;
        arrivedAt = arrivedAt ?? new Date();
      } else if (status === EvacuationStatus.DIRECTED || status === EvacuationStatus.NOT_CONFIRMED) {
        status = EvacuationStatus.IN_TRANSIT;
      }
      if ((dto.accuracyM ?? 0) > 150) riskScore = Math.max(riskScore, 35);
    }

    return this.prisma.emergencyEvacuation.update({
      where: { id: evacuation.id },
      data: {
        status,
        arrivedAt,
        lastLatitude: dto.latitude,
        lastLongitude: dto.longitude,
        lastAccuracyM: dto.accuracyM,
        riskScore,
      },
      include: { employee: true, assemblyPoint: true, shelter: true },
    });
  }

  @Post('incidents/:incidentId/direct/:employeeId')
  async directEmployee(
    @Req() req: any,
    @Param('incidentId') incidentId: string,
    @Param('employeeId') employeeId: string,
    @Body() body: { destinationType: SafeLocationType; destinationId: string },
  ) {
    const incident = await this.prisma.emergencyIncident.findFirst({ where: { id: incidentId, companyId: req.user.companyId, status: EmergencyStatus.ACTIVE } });
    if (!incident) throw new BadRequestException('الحادث غير موجود أو غير نشط');

    const data: any = {
      destinationType: body.destinationType,
      status: EvacuationStatus.DIRECTED,
      directedAt: new Date(),
      assemblyPointId: null,
      shelterId: null,
    };
    if (body.destinationType === SafeLocationType.SHELTER) data.shelterId = body.destinationId;
    else data.assemblyPointId = body.destinationId;

    return this.prisma.emergencyEvacuation.update({
      where: { incidentId_employeeId: { incidentId, employeeId } },
      data,
      include: { employee: true, assemblyPoint: true, shelter: true },
    });
  }

  private async ensureStation(companyId: string, stationId: string) {
    const station = await this.prisma.station.findFirst({ where: { id: stationId, companyId } });
    if (!station) throw new BadRequestException('المنشأة غير موجودة');
    return station;
  }
}
