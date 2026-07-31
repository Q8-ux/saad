import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StationsController } from './stations.controller';

@Module({ imports: [PrismaModule], controllers: [StationsController] })
export class StationsModule {}
