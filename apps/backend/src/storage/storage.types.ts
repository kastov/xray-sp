/** Row stored in the `current` sub-database, keyed by `sid`. */
export interface CurrentRecord {
  /** Original (uncleaned) server name as reported by the checker. */
  rawName: string;
  /** Cleaned display name (resolved via resolveGeo). */
  name: string;
  /** ISO 3166-1 alpha-2 (lowercase), or '' when unknown. */
  cc: string;
  /** Flag emoji derived from cc, or '' when unknown. */
  emoji: string;
  online: 0 | 1;
  latency: number;
  /** Unix seconds of last update. */
  ts: number;
  /** Display order index from the checker payload. */
  seq: number;
}

/** Row stored in the `daily` sub-database, keyed by `${day}|${sid}`. */
export interface DailyRecord {
  up: number;
  down: number;
  latSum: number;
  latCnt: number;
  /** Count of confirmed (consecutive) down samples. */
  downConf: number;
}

/** Row stored in the `samples` sub-database, keyed by `[sid, ts]`. */
export interface SampleRecord {
  online: 0 | 1;
  latency: number;
}
