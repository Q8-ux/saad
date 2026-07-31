import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard('jwt'))
@Controller('stations')
export class StationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() req: any) {
    return this.prisma.station.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      orderBy: { nameAr: 'asc' },
    });
  }
}
