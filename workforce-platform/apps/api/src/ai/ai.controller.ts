import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AiAnalysisRequest, AiSection, AiService } from './ai.service';

const sections: AiSection[] = ['ATTENDANCE','TRANSFERS','EMERGENCY','SAFETY','ASSETS','REPORTS','NOTIFICATIONS','EXECUTIVE'];

class AnalyzeDto {
  @IsIn(sections) section!: AiSection;
  @IsString() @MinLength(3) @MaxLength(2000) task!: string;
  @IsOptional() data?: unknown;
  @IsOptional() @IsIn(['ar','en']) language?: 'ar' | 'en';
}

@UseGuards(AuthGuard('jwt'))
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('capabilities')
  capabilities() {
    return this.ai.capabilities();
  }

  @Post('analyze')
  analyze(@Body() dto: AnalyzeDto) {
    return this.ai.analyze(dto as AiAnalysisRequest);
  }
}
