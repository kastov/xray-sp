import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

/** Typed, centralized access to all environment-driven configuration. */
@Injectable()
export class AppConfigService {
  /** Base URL of the xray-checker instance (trailing slash stripped). */
  readonly checkerUrl: string;
  /** Poll interval in seconds. */
  readonly pollInterval: number;
  /** Number of days shown in the uptime bar. */
  readonly days: number;
  /** Days of raw samples retained. */
  readonly sampleRetainDays: number;
  /** Root data directory. */
  readonly dataDir: string;
  /** Absolute path to the LMDB store. */
  readonly lmdbPath: string;
  /** Absolute path to the uploaded brand image directory. */
  readonly brandDir: string;
  /** HTTP listen port. */
  readonly port: number;
  /** IANA timezone used for day boundaries and labels. */
  readonly tz: string;
  /** Seed title (only used when config is not yet stored). */
  readonly title: string;
  /** Seed subtitle (only used when config is not yet stored). */
  readonly subtitle: string;
  /** Value of the masked `Server` response header. */
  readonly serverHeader: string;
  /** Admin username. */
  readonly adminUsername: string;
  /** Admin password. */
  readonly adminPassword: string;
  /** Secret used to sign session JWTs. */
  readonly sessionSecret: string;

  constructor() {
    const env = process.env;

    this.checkerUrl = (env.CHECKER_URL || 'http://xray-checker:2112').replace(/\/+$/, '');
    this.pollInterval = this.int(env.POLL_INTERVAL, 60);
    this.days = this.int(env.DAYS, 30);
    this.sampleRetainDays = this.int(env.SAMPLE_RETAIN_DAYS, this.days + 1);
    this.dataDir = env.DATA_DIR || '/data';
    this.lmdbPath = `${this.dataDir}/status.lmdb`;
    this.brandDir = `${this.dataDir}/brand`;
    this.port = this.int(env.PORT, 8080);
    this.tz = env.TZ || 'Europe/Moscow';
    this.title = env.TITLE || 'Статус серверов';
    this.subtitle = env.SUBTITLE || 'Доступность серверов в реальном времени';
    this.serverHeader = env.SERVER_HEADER || 'nginx';
    this.adminUsername = env.ADMIN_USERNAME || 'admin';
    this.adminPassword = env.ADMIN_PASSWORD || 'admin';

    // If no explicit secret is provided, derive a stable one from the admin
    // credentials so issued sessions survive a process restart.
    this.sessionSecret =
      env.SESSION_SECRET ||
      createHash('sha256')
        .update(`${this.adminUsername}:${this.adminPassword}`)
        .digest('hex');
  }

  private int(value: string | undefined, fallback: number): number {
    const n = Number.parseInt(value ?? '', 10);
    return Number.isFinite(n) ? n : fallback;
  }
}
