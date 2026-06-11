import { Module } from '@nestjs/common';
import { PollerService } from './poller.service';

@Module({
  providers: [PollerService],
})
export class PollerModule {}
