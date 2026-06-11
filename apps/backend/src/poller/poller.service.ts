import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DEFAULT_CONFIG, resolveGeo } from '@status/shared';
import { AppConfigService } from '../config/app-config.service';
import { StorageService } from '../storage/storage.service';
import type { CurrentRecord, DailyRecord } from '../storage/storage.types';
import { SECONDS_PER_DAY, dayString, nowSec } from '../common/time.util';

const POLL_INTERVAL_NAME = 'poll-checker';
/** Retention is disk hygiene, not correctness, so run it at most hourly. */
const RETENTION_INTERVAL_SEC = 3600;

/** A single proxy entry as reported by the checker API. */
interface ProxyEntry {
  stableId?: string;
  name?: string;
  online?: boolean;
  latencyMs?: number;
}

@Injectable()
export class PollerService implements OnModuleInit {
  private readonly logger = new Logger(PollerService.name);
  /** Prevents overlapping ticks if a poll outlasts the interval. */
  private running = false;
  private lastRetentionAt = 0;

  constructor(
    private readonly config: AppConfigService,
    private readonly storage: StorageService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    this.seedConfig();
    // Poll immediately, then on a managed interval (cleared on shutdown).
    void this.tick();
    const interval = setInterval(() => void this.tick(), this.config.pollInterval * 1000);
    this.scheduler.addInterval(POLL_INTERVAL_NAME, interval);
  }

  /** Write the default branding/theme config on first ever start. */
  private seedConfig(): void {
    if (this.storage.getConfig()) return;
    void this.storage.setConfig({
      branding: {
        ...DEFAULT_CONFIG.branding,
        title: this.config.title,
        subtitle: this.config.subtitle,
      },
      theme: DEFAULT_CONFIG.theme,
    });
    this.logger.log('Seeded default config');
  }

  /** One poll cycle; failures are logged and never break the interval. */
  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.poll();
    } catch (err) {
      this.logger.error(`poll failed: ${(err as Error)?.message ?? err}`);
    } finally {
      this.running = false;
    }
  }

  private async poll(): Promise<void> {
    const proxies = await this.fetchProxies();
    const now = nowSec();
    const today = dayString(this.config.tz);

    this.storage.current.transactionSync(() => {
      proxies.forEach((proxy, seq) => this.record(proxy, seq, now, today));
    });

    this.storage.bumpRevision();
    this.runRetention(now);
  }

  /** Fetch the proxy list with a bounded timeout. */
  private async fetchProxies(): Promise<ProxyEntry[]> {
    const res = await fetch(`${this.config.checkerUrl}/api/v1/public/proxies`, {
      headers: { 'User-Agent': 'xray-status/2.0' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`checker responded HTTP ${res.status}`);

    const payload: unknown = await res.json();
    const data =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as { data?: ProxyEntry[] }).data
        : (payload as ProxyEntry[]);
    return data ?? [];
  }

  /** Persist the current status, daily aggregate and raw sample for one proxy. */
  private record(proxy: ProxyEntry, seq: number, now: number, today: string): void {
    const sid = proxy.stableId?.trim();
    if (!sid) return;

    const online: 0 | 1 = proxy.online ? 1 : 0;
    const latency = Math.max(0, Math.trunc(proxy.latencyMs ?? 0));
    const rawName = proxy.name || sid;
    const geo = resolveGeo(rawName);

    const previous = this.storage.current.get(sid);
    const confirmedDown = this.isConfirmedDown(online, previous, now);

    const current: CurrentRecord = {
      rawName,
      name: geo.name,
      cc: geo.cc,
      emoji: geo.emoji,
      online,
      latency,
      ts: now,
      seq,
    };
    this.storage.current.put(sid, current);
    this.accrueDaily(today, sid, online, latency, confirmedDown);
    this.storage.samples.put([sid, now], { online, latency });
  }

  /**
   * A down sample only counts as real downtime when the previous sample was
   * also down within one interval — a single blip is treated as noise.
   */
  private isConfirmedDown(online: 0 | 1, previous: CurrentRecord | undefined, now: number): boolean {
    return (
      online === 0 &&
      previous?.online === 0 &&
      previous.ts != null &&
      now - previous.ts <= this.config.pollInterval * 2
    );
  }

  /** Fold one sample into the day's aggregate counters. */
  private accrueDaily(
    day: string,
    sid: string,
    online: 0 | 1,
    latency: number,
    confirmedDown: boolean,
  ): void {
    const key = StorageService.dailyKey(day, sid);
    const prev = this.storage.daily.get(key);
    const hasPing = online === 1 && latency > 0;

    const next: DailyRecord = {
      up: (prev?.up ?? 0) + online,
      down: (prev?.down ?? 0) + (1 - online),
      latSum: (prev?.latSum ?? 0) + (hasPing ? latency : 0),
      latCnt: (prev?.latCnt ?? 0) + (hasPing ? 1 : 0),
      downConf: (prev?.downConf ?? 0) + (confirmedDown ? 1 : 0),
    };
    this.storage.daily.put(key, next);
  }

  /** Throttled retention sweep across daily aggregates and raw samples. */
  private runRetention(now: number): void {
    if (now - this.lastRetentionAt < RETENTION_INTERVAL_SEC) return;
    this.lastRetentionAt = now;

    const dailyCutoff = dayString(
      this.config.tz,
      new Date((now - (this.config.days + 1) * SECONDS_PER_DAY) * 1000),
    );
    const sampleCutoff = now - this.config.sampleRetainDays * SECONDS_PER_DAY;

    const daily = this.storage.pruneDaily(dailyCutoff);
    const samples = this.storage.pruneSamples(sampleCutoff);
    if (daily || samples) {
      this.logger.log(`retention removed ${daily} daily rows, ${samples} samples`);
    }
  }
}
