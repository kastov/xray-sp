import { Controller, Get, Header, Query } from '@nestjs/common';
import type { DayPayload, PublicConfig, Summary } from '@status/shared';
import { DEFAULT_CONFIG } from '@status/shared';
import { StatusService } from './status.service';
import { StorageService } from '../storage/storage.service';

const NO_CACHE = 'no-cache, no-store, must-revalidate';

@Controller('api')
export class StatusController {
  constructor(
    private readonly status: StatusService,
    private readonly storage: StorageService,
  ) {}

  @Get('summary')
  @Header('Cache-Control', NO_CACHE)
  getSummary(): Summary {
    return this.status.getSummary();
  }

  @Get('today')
  @Header('Cache-Control', NO_CACHE)
  getToday(@Query('sid') sid?: string): DayPayload {
    return this.status.getToday(sid || '');
  }

  @Get('day')
  @Header('Cache-Control', NO_CACHE)
  getDay(@Query('sid') sid?: string, @Query('date') date?: string): DayPayload {
    return this.status.getDay(sid || '', date || '');
  }

  @Get('config')
  @Header('Cache-Control', NO_CACHE)
  getConfig(): PublicConfig {
    return this.storage.getConfig() ?? DEFAULT_CONFIG;
  }
}
