// ---------------------------------------------------------------------------
// Shared API contract between the NestJS backend and the React frontend.
// ---------------------------------------------------------------------------

/** One day cell in the 30-day uptime bar. */
export interface DayCell {
  /** YYYY-MM-DD in the configured timezone. */
  date: string;
  /** Short localized label, e.g. "11 июн". */
  label: string;
  /** Uptime percentage for the day, or null when there is no data. */
  uptime: number | null;
  /** Confirmed downtime in minutes for the day. */
  downMin: number;
  hasData: boolean;
}

export interface ServerSummary {
  sid: string;
  /** Cleaned display name (flag/country-code prefix stripped). */
  name: string;
  /** ISO 3166-1 alpha-2 (lowercase), or '' when unknown. */
  cc: string;
  /** Flag emoji derived from cc, or '' when unknown. */
  emoji: string;
  online: boolean;
  latencyMs: number;
  uptime30: number | null;
  downMin30: number;
  days: DayCell[];
}

export interface Totals {
  online: number;
  total: number;
  uptime30: number | null;
  avgLatency: number;
  downMin30: number;
}

export interface Summary {
  days: number;
  pollInterval: number;
  generatedAt: string;
  lastCheck: string | null;
  servers: ServerSummary[];
  totals: Totals;
}

export interface DaySample {
  ts: number;
  online: boolean;
  latency: number;
}

export interface DayStats {
  checks: number;
  errors: number;
  pmin: number;
  pavg: number;
  pmax: number;
}

export interface DayPayload {
  dayStart: number;
  now: number;
  isToday: boolean;
  dayLabel: string;
  pollInterval: number;
  samples: DaySample[];
  stats: DayStats;
}

// ---------------------------------------------------------------------------
// Theme / branding configuration (managed from the admin panel).
// ---------------------------------------------------------------------------

/** Color tokens. Mirrors the original CSS custom properties. */
export interface Palette {
  bg: string;
  card: string;
  soft: string;
  line: string;
  hover: string;
  tx: string;
  tx2: string;
  tx3: string;
  ok: string;
  warn: string;
  orange: string;
  bad: string;
  info: string;
  /** No-data bar color. */
  nodata: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  defaultTheme: ThemeMode;
  /** Whether the in-page light/dark toggle is shown. */
  allowToggle: boolean;
  light: Palette;
  dark: Palette;
}

export interface BrandingConfig {
  title: string;
  subtitle: string;
  /** True when a custom logo/favicon has been uploaded. */
  hasLogo: boolean;
  /** Cache-busting version stamp for the logo asset. */
  logoVersion: number;
}

/** Public configuration served to every visitor. */
export interface PublicConfig {
  branding: BrandingConfig;
  theme: ThemeConfig;
}

/** Full editable configuration (admin only). Currently identical to public. */
export type AdminConfig = PublicConfig;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SessionInfo {
  authenticated: boolean;
  username?: string;
}
