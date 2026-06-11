import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Winston logger instance wired into Nest via `WinstonModule.createLogger`.
 * Renders Nest-style colored output with millisecond timestamps.
 */
export function createAppLogger(): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.align(),
      nestWinstonModuleUtilities.format.nestLike('StatusPage', {
        colors: true,
        prettyPrint: true,
        processId: false,
        appName: true,
      }),
    ),
  });
}
