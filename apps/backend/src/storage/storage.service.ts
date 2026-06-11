import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { open, type Database, type RootDatabase } from 'lmdb';
import type { PublicConfig } from '@status/shared';
import { AppConfigService } from '../config/app-config.service';
import type {
  CurrentRecord,
  DailyRecord,
  SampleRecord,
} from './storage.types';

/**
 * Embedded LMDB store, organized into named sub-databases:
 *  - meta:    'config' -> PublicConfig
 *  - current: sid -> CurrentRecord
 *  - daily:   `${day}|${sid}` -> DailyRecord
 *  - samples: [sid, ts] (ordered array key) -> SampleRecord
 *
 * A monotonic {@link revision} is bumped whenever the dataset changes, letting
 * read models (e.g. the summary) cache results until the next mutation.
 */
@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private root!: RootDatabase;
  private metaDb!: Database<PublicConfig, string>;
  private currentDb!: Database<CurrentRecord, string>;
  private dailyDb!: Database<DailyRecord, string>;
  private samplesDb!: Database<SampleRecord, [string, number]>;
  private _revision = 0;

  constructor(private readonly config: AppConfigService) {}

  /** Monotonic counter incremented on every dataset mutation. */
  get revision(): number {
    return this._revision;
  }

  /** Signal that the dataset changed; invalidates revision-keyed caches. */
  bumpRevision(): void {
    this._revision++;
  }

  onModuleInit(): void {
    mkdirSync(this.config.dataDir, { recursive: true });

    this.root = open({
      path: this.config.lmdbPath,
      compression: true,
      // A handful of named sub-databases; bump maxDbs to be safe.
      maxDbs: 8,
    });

    this.metaDb = this.root.openDB<PublicConfig, string>({ name: 'meta' });
    this.currentDb = this.root.openDB<CurrentRecord, string>({ name: 'current' });
    this.dailyDb = this.root.openDB<DailyRecord, string>({ name: 'daily' });
    this.samplesDb = this.root.openDB<SampleRecord, [string, number]>({
      name: 'samples',
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.root) await this.root.close();
  }

  // --- accessors -----------------------------------------------------------

  get meta(): Database<PublicConfig, string> {
    return this.metaDb;
  }
  get current(): Database<CurrentRecord, string> {
    return this.currentDb;
  }
  get daily(): Database<DailyRecord, string> {
    return this.dailyDb;
  }
  get samples(): Database<SampleRecord, [string, number]> {
    return this.samplesDb;
  }

  // --- config helpers ------------------------------------------------------

  getConfig(): PublicConfig | undefined {
    return this.metaDb.get('config');
  }

  async setConfig(cfg: PublicConfig): Promise<void> {
    await this.metaDb.put('config', cfg);
  }

  // --- current helpers -----------------------------------------------------

  /** All current rows (with their `sid` key) ordered by their `seq` index. */
  listCurrentBySeq(): (CurrentRecord & { sid: string })[] {
    const rows: (CurrentRecord & { sid: string })[] = [];
    for (const { key, value } of this.currentDb.getRange()) {
      rows.push({ ...value, sid: String(key) });
    }
    rows.sort((a, b) => a.seq - b.seq);
    return rows;
  }

  // --- daily helpers -------------------------------------------------------

  static dailyKey(day: string, sid: string): string {
    return `${day}|${sid}`;
  }

  /** Map of `sid` -> (`day` -> DailyRecord) across the whole daily db. */
  loadDailyBySid(): Map<string, Map<string, DailyRecord>> {
    const bySid = new Map<string, Map<string, DailyRecord>>();
    for (const { key, value } of this.dailyDb.getRange()) {
      const sep = key.indexOf('|');
      if (sep < 0) continue;
      const day = key.slice(0, sep);
      const sid = key.slice(sep + 1);
      let inner = bySid.get(sid);
      if (!inner) {
        inner = new Map();
        bySid.set(sid, inner);
      }
      inner.set(day, value);
    }
    return bySid;
  }

  // --- sample helpers ------------------------------------------------------

  /** Ordered samples for a single sid within [tsStart, tsEnd). */
  rangeSamples(sid: string, tsStart: number, tsEnd: number): Array<{ ts: number; rec: SampleRecord }> {
    const out: Array<{ ts: number; rec: SampleRecord }> = [];
    for (const { key, value } of this.samplesDb.getRange({
      start: [sid, tsStart],
      end: [sid, tsEnd],
    })) {
      out.push({ ts: key[1], rec: value });
    }
    return out;
  }

  // --- retention -----------------------------------------------------------

  /** Drop daily aggregates for days strictly before `cutoffDay`. Returns count. */
  pruneDaily(cutoffDay: string): number {
    const stale: string[] = [];
    for (const key of this.dailyDb.getKeys()) {
      const sep = key.indexOf('|');
      if (sep > 0 && key.slice(0, sep) < cutoffDay) stale.push(key);
    }
    if (stale.length === 0) return 0;
    this.dailyDb.transactionSync(() => {
      for (const key of stale) this.dailyDb.remove(key);
    });
    return stale.length;
  }

  /**
   * Drop samples older than `tsCutoff`. Uses an ordered range scan per known
   * sid, so it only touches the stale tail rather than the whole sample set.
   */
  pruneSamples(tsCutoff: number): number {
    const stale: [string, number][] = [];
    for (const sid of this.currentDb.getKeys()) {
      const id = String(sid);
      for (const key of this.samplesDb.getKeys({ start: [id, 0], end: [id, tsCutoff] })) {
        stale.push(key);
      }
    }
    if (stale.length === 0) return 0;
    this.samplesDb.transactionSync(() => {
      for (const key of stale) this.samplesDb.remove(key);
    });
    return stale.length;
  }
}
