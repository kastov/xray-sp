import { Injectable } from '@nestjs/common';
import type {
  DayCell,
  DayPayload,
  DaySample,
  DayStats,
  ServerSummary,
  Summary,
  Totals,
} from '@status/shared';
import { AppConfigService } from '../config/app-config.service';
import { StorageService } from '../storage/storage.service';
import type { CurrentRecord, DailyRecord } from '../storage/storage.types';
import {
  SECONDS_PER_DAY,
  SECONDS_PER_MINUTE,
  dateTimeString,
  dayLabelFromString,
  dayLabelFromTs,
  dayList,
  dayString,
  midnightTs,
  midnightTsForDate,
  nowSec,
  parseDate,
} from '../common/time.util';

/** Round a percentage to two decimals. */
const pct2 = (value: number): number => Math.round(value * 100) / 100;

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

type CurrentRow = CurrentRecord & { sid: string };

/** A server's day cells plus the running totals they contributed. */
interface ServerAggregate {
  readonly summary: ServerSummary;
  readonly up: number;
  readonly total: number;
  readonly downMin: number;
}

@Injectable()
export class StatusService {
  /** Memoized summary, valid while the storage revision and calendar day hold. */
  private cache: { readonly key: string; readonly value: Summary } | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly storage: StorageService,
  ) {}

  /**
   * The 30-day overview. Recomputing it scans every daily aggregate, so the
   * result is memoized and only rebuilt when the data changes (storage
   * revision) or the calendar day rolls over.
   */
  getSummary(): Summary {
    const key = `${this.storage.revision}:${dayString(this.config.tz)}`;
    if (this.cache?.key === key) return this.cache.value;

    const value = this.computeSummary();
    this.cache = { key, value };
    return value;
  }

  /** Per-minute detail for today. */
  getToday(sid: string): DayPayload {
    return this.dayPayload(sid, midnightTs(this.config.tz), true);
  }

  /** Per-minute detail for an explicit day; invalid dates fall back to today. */
  getDay(sid: string, dateStr: string): DayPayload {
    const date = parseDate(dateStr);
    if (!date) return this.getToday(sid);

    const { tz } = this.config;
    const dayStart = midnightTsForDate(tz, date.year, date.month, date.day);
    return this.dayPayload(sid, dayStart, dayStart === midnightTs(tz));
  }

  // -------------------------------------------------------------------------

  private computeSummary(): Summary {
    const { tz, days, pollInterval } = this.config;
    const now = new Date();
    const calendar = dayList(tz, days, now);
    const minutesPerSample = pollInterval / SECONDS_PER_MINUTE;

    const servers = this.storage.listCurrentBySeq();
    const dailyBySid = this.storage.loadDailyBySid();

    const aggregates = servers.map((server) =>
      this.aggregateServer(server, dailyBySid.get(server.sid), calendar, minutesPerSample),
    );

    const lastCheckTs = servers.reduce((max, s) => Math.max(max, s.ts), 0);

    return {
      days,
      pollInterval,
      generatedAt: dateTimeString(tz, now),
      lastCheck: lastCheckTs ? dateTimeString(tz, new Date(lastCheckTs * 1000)) : null,
      servers: aggregates.map((a) => a.summary),
      totals: this.totals(servers, aggregates),
    };
  }

  private aggregateServer(
    server: CurrentRow,
    daily: ReadonlyMap<string, DailyRecord> | undefined,
    calendar: readonly string[],
    minutesPerSample: number,
  ): ServerAggregate {
    let up = 0;
    let total = 0;
    let downMin = 0;

    const days: DayCell[] = calendar.map((date) => {
      const rec = daily?.get(date);
      const dayTotal = rec ? rec.up + rec.down : 0;
      const cellDownMin = rec ? Math.round(rec.downConf * minutesPerSample) : 0;

      up += rec?.up ?? 0;
      total += dayTotal;
      downMin += cellDownMin;

      return {
        date,
        label: dayLabelFromString(date),
        uptime: dayTotal ? pct2((rec!.up / dayTotal) * 100) : null,
        downMin: cellDownMin,
        hasData: dayTotal > 0,
      };
    });

    const summary: ServerSummary = {
      sid: server.sid,
      name: server.name,
      cc: server.cc,
      emoji: server.emoji,
      online: server.online === 1,
      latencyMs: server.latency,
      uptime30: total ? pct2((up / total) * 100) : null,
      downMin30: downMin,
      days,
    };

    return { summary, up, total, downMin };
  }

  private totals(servers: readonly CurrentRow[], aggregates: readonly ServerAggregate[]): Totals {
    let online = 0;
    const latencies: number[] = [];
    for (const s of servers) {
      if (s.online !== 1) continue;
      online++;
      if (s.latency > 0) latencies.push(s.latency);
    }

    const grandUp = sum(aggregates.map((a) => a.up));
    const grandTotal = sum(aggregates.map((a) => a.total));

    return {
      online,
      total: servers.length,
      uptime30: grandTotal ? pct2((grandUp / grandTotal) * 100) : null,
      avgLatency: latencies.length ? Math.round(sum(latencies) / latencies.length) : 0,
      downMin30: sum(aggregates.map((a) => a.downMin)),
    };
  }

  private dayPayload(sid: string, dayStart: number, isToday: boolean): DayPayload {
    const dayEnd = dayStart + SECONDS_PER_DAY;
    const rows = this.storage.rangeSamples(sid, dayStart, dayEnd);

    const samples: DaySample[] = new Array(rows.length);
    let errors = 0;
    let pingSum = 0;
    let pingCount = 0;
    let pmin = Infinity;
    let pmax = 0;

    for (let i = 0; i < rows.length; i++) {
      const { ts, rec } = rows[i];
      const online = rec.online === 1;
      samples[i] = { ts, online, latency: rec.latency };

      if (!online) {
        errors++;
      } else if (rec.latency > 0) {
        pingSum += rec.latency;
        pingCount++;
        if (rec.latency < pmin) pmin = rec.latency;
        if (rec.latency > pmax) pmax = rec.latency;
      }
    }

    const stats: DayStats = {
      checks: rows.length,
      errors,
      pmin: pingCount ? pmin : 0,
      pavg: pingCount ? Math.round(pingSum / pingCount) : 0,
      pmax: pingCount ? pmax : 0,
    };

    return {
      dayStart,
      now: isToday ? nowSec() : dayEnd,
      isToday,
      dayLabel: isToday ? 'Сегодня' : dayLabelFromTs(this.config.tz, dayStart),
      pollInterval: this.config.pollInterval,
      samples,
      stats,
    };
  }
}
