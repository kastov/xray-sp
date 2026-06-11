import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from './config/config.module';
import { StorageModule } from './storage/storage.module';
import { StatusModule } from './status/status.module';
import { PollerModule } from './poller/poller.module';
import { AdminModule } from './admin/admin.module';
import { BrandModule } from './brand/brand.module';

/**
 * Built React SPA location. The frontend builds to apps/frontend/dist; from the
 * compiled backend (apps/backend/dist) that is ../../frontend/dist.
 */
const FRONTEND_DIST = join(__dirname, '..', '..', 'frontend', 'dist');

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    StorageModule,
    BrandModule,
    StatusModule,
    AdminModule,
    PollerModule,
    // SPA fallback for all non-API, non-brand routes.
    ServeStaticModule.forRoot({
      rootPath: FRONTEND_DIST,
      serveStaticOptions: { index: false, fallthrough: true },
      // Let the API, admin and brand routes be handled by their controllers.
      exclude: [
        '/api/{*path}',
        '/favicon.ico',
        '/favicon.png',
        '/logo',
      ],
    }),
  ],
})
export class AppModule {}
