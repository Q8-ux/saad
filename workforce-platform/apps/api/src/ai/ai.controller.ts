import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AiAnalysisRequest, AiSection, AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

const sections: AiSection[] = ['ATTENDANCE','TRANSFERS','EMERGENCY','SAFETY','ASSETS','REPORTS','NOTIFICATIONS','EXECUTIVE'];
const privilegedRoles = ['SUPER_ADMIN','COMPANY_ADMIN','HR_MANAGER','SUPERVISOR','AUDITOR'];

class AnalyzeDto {
  @IsIn(sections) section!: AiSection;
  @IsString() @MinLength(3) @MaxLength(2000) task!: string;
  @IsOptional() data?: unknown;
  @IsOptional() @IsIn(['ar','en']) language?: 'ar' | 'en';
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsString() entityId?: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService, private readonly prisma: PrismaService) {}

  private actor(req: any) {
    return {
      companyId: req.user.companyId,
      userId: req.user.userId ?? req.user.id,
      role: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    };
  }

  private requirePrivileged(req: any) {
    if (!privilegedRoles.includes(req.user.role)) throw new ForbiddenException('ليست لديك صلاحية تشغيل التحليل المؤسسي');
  }

  @Get('capabilities')
  capabilities() { return this.ai.capabilities(); }

  @Get('history')
  history(@Req() req: any, @Query('limit') limit?: string) {
    this.requirePrivileged(req);
    return this.ai.history(req.user.companyId, Number(limit || 50));
  }

  @Post('analyze')
  analyze(@Req() req: any, @Body() dto: AnalyzeDto) {
    this.requirePrivileged(req);
    return this.ai.analyze(dto as AiAnalysisRequest, this.actor(req));
  }

  @Post('attendance/today')
  async attendanceToday(@Req() req: any) {
    this.requirePrivileged(req);
    const start = new Date(); start.setHours(0,0,0,0);
    const rows = await this.prisma.attendance.findMany({
      where: { companyId: req.user.companyId, recordedAt: { gte: start } },
      include: { employee: { select: { employeeNo: true, fullNameAr: true, department: true } }, station: { select: { nameAr: true, geofenceM: true } } },
      orderBy: { recordedAt: 'desc' }, take: 500,
    });
    return this.ai.analyze({
      section: 'ATTENDANCE', task: 'حلل حضور اليوم وحدد الحالات غير الطبيعية وأولويات المراجعة.',
      data: rows.map(x => ({ employeeNo:x.employee.employeeNo, name:x.employee.fullNameAr.split(/\s+/).slice(0,2).join(' '), department:x.employee.department, station:x.station?.nameAr, type:x.type, decision:x.decision, riskScore:x.riskScore, accuracyM:x.accuracyM, distanceM:x.distanceFromStationM, mockLocationDetected:x.mockLocationDetected, deviceIntegrity:x.deviceIntegrity, recordedAt:x.recordedAt })),
      entityType: 'ATTENDANCE_DAY', entityId: start.toISOString().slice(0,10),
    }, this.actor(req));
  }

  @Post('transfers/active')
  async transfersActive(@Req() req: any) {
    this.requirePrivileged(req);
    const rows = await this.prisma.transferPermit.findMany({
      where: { companyId:req.user.companyId, status:{ notIn:['COMPLETED','CANCELLED','EXPIRED'] } },
      include:{ employee:{select:{employeeNo:true,fullNameAr:true}}, originStation:{select:{nameAr:true}}, destinationStation:{select:{nameAr:true}} },
      orderBy:{createdAt:'desc'}, take:300,
    });
    return this.ai.analyze({ section:'TRANSFERS', task:'حلل تصاريح الانتقال النشطة وحدد التأخير والانحرافات والحالات التي تحتاج تدخلاً.', data:rows, entityType:'ACTIVE_TRANSFERS' }, this.actor(req));
  }

  @Post('emergency/:incidentId')
  async emergency(@Req() req:any, @Param('incidentId') incidentId:string) {
    this.requirePrivileged(req);
    const incident = await this.prisma.emergencyIncident.findFirst({
      where:{id:incidentId,companyId:req.user.companyId},
      include:{station:true,evacuations:{include:{employee:{select:{employeeNo:true,fullNameAr:true}},assemblyPoint:true,shelter:true}}},
    });
    if(!incident) throw new BadRequestException('الحادث غير موجود');
    const safe = await Promise.all([
      this.prisma.assemblyPoint.findMany({where:{stationId:incident.stationId,isActive:true}}),
      this.prisma.shelter.findMany({where:{stationId:incident.stationId,isActive:true}}),
      this.prisma.criticalAsset.findMany({where:{stationId:incident.stationId,isActive:true}}),
    ]);
    return this.ai.analyze({ section:'EMERGENCY', task:'حلل الحادث الحالي والإخلاء ورتب الأولويات والإجراءات الفورية الآمنة.', data:{incident,safeLocations:{assemblyPoints:safe[0],shelters:safe[1]},criticalAssets:safe[2]}, entityType:'EMERGENCY_INCIDENT',entityId:incidentId },this.actor(req));
  }

  @Post('assets/station/:stationId')
  async assets(@Req() req:any,@Param('stationId') stationId:string){
    this.requirePrivileged(req);
    const station=await this.prisma.station.findFirst({where:{id:stationId,companyId:req.user.companyId}});
    if(!station) throw new BadRequestException('المنشأة غير موجودة');
    const assets=await this.prisma.criticalAsset.findMany({where:{stationId,isActive:true},orderBy:{riskLevel:'desc'}});
    return this.ai.analyze({section:'ASSETS',task:'حلل الأصول الحرجة وحدد أولويات الفحص والصيانة وخطط الاستجابة.',data:{station,assets},entityType:'STATION_ASSETS',entityId:stationId},this.actor(req));
  }

  @Post('executive/summary')
  async executive(@Req() req:any){
    this.requirePrivileged(req);
    const start=new Date();start.setHours(0,0,0,0);
    const [employees,stations,attendance,suspicious,activeTransfers,activeIncidents]=await Promise.all([
      this.prisma.employee.count({where:{companyId:req.user.companyId,isActive:true}}),
      this.prisma.station.count({where:{companyId:req.user.companyId,isActive:true}}),
      this.prisma.attendance.count({where:{companyId:req.user.companyId,recordedAt:{gte:start}}}),
      this.prisma.attendance.count({where:{companyId:req.user.companyId,recordedAt:{gte:start},decision:{in:['REJECTED','REVIEW_REQUIRED']}}}),
      this.prisma.transferPermit.count({where:{companyId:req.user.companyId,status:{notIn:['COMPLETED','CANCELLED','EXPIRED']}}}),
      this.prisma.emergencyIncident.count({where:{companyId:req.user.companyId,status:'ACTIVE'}}),
    ]);
    return this.ai.analyze({section:'EXECUTIVE',task:'أنشئ ملخصًا تنفيذيًا لليوم مع المخاطر والقرارات المطلوبة.',data:{date:start.toISOString().slice(0,10),employees,stations,attendanceToday:attendance,suspiciousAttendance:suspicious,activeTransfers,activeIncidents},entityType:'EXECUTIVE_DAILY',entityId:start.toISOString().slice(0,10)},this.actor(req));
  }
}
