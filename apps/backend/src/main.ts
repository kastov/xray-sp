import 'reflect-metadata';
process.title = 'status-page';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { WinstonModule } from 'nest-winston';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { createAppLogger } from './common/logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({ instance: createAppLogger() }),
  });

  const config = app.get(AppConfigService);

  // Hide framework fingerprint; advertise the configured server header.
  app.disable('x-powered-by');

  app.use(compression());
  app.use(cookieParser());

  // Mask the Server header and discourage indexing on every response.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Server', config.serverHeader);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');

  const version = process.env.APP_VERSION || 'dev';
  const commit = process.env.GIT_COMMIT ? ` (${process.env.GIT_COMMIT.slice(0, 7)})` : '';
  new Logger('Bootstrap').log(
    `status-page v${version}${commit} on :${config.port}, checker=${config.checkerUrl}, tz=${config.tz}`,
  );
}

void bootstrap();
