import type { Palette, ThemeConfig, BrandingConfig, PublicConfig } from './types.js';

// Default palettes ported 1:1 from the original status page CSS variables.
// The uptime-bar thresholds (ok/warn/orange/bad) reuse the bright values the
// original JS hard-coded for the bars, so a single palette drives both the
// pills and the bars and stays fully customizable from the admin panel.

export const DEFAULT_LIGHT: Palette = {
  bg: '#fbfcfe',
  card: '#ffffff',
  soft: '#f1f5fb',
  line: '#e4e9f0',
  hover: '#f3f7fd',
  tx: '#13171d',
  tx2: '#46505f',
  tx3: '#69727f',
  ok: '#16b07a',
  warn: '#f0a82a',
  orange: '#e3692f',
  bad: '#e8504e',
  info: '#2f6bff',
  nodata: '#cfd6df',
};

export const DEFAULT_DARK: Palette = {
  bg: '#16181d',
  card: '#1f232a',
  soft: '#23272f',
  line: '#333a45',
  hover: '#262b33',
  tx: '#f1f4f9',
  tx2: '#b2bbc8',
  tx3: '#8d97a5',
  ok: '#26c089',
  warn: '#f2b13e',
  orange: '#ec7242',
  bad: '#f25c5a',
  info: '#5b8cff',
  nodata: '#3a424d',
};

export const DEFAULT_THEME: ThemeConfig = {
  defaultTheme: 'system',
  allowToggle: true,
  light: DEFAULT_LIGHT,
  dark: DEFAULT_DARK,
};

export const DEFAULT_BRANDING: BrandingConfig = {
  title: 'Статус серверов',
  subtitle: 'Доступность серверов в реальном времени',
  hasLogo: false,
  logoVersion: 0,
};

export const DEFAULT_CONFIG: PublicConfig = {
  branding: DEFAULT_BRANDING,
  theme: DEFAULT_THEME,
};

/** Keys of a Palette, used by the admin form and validation. */
export const PALETTE_KEYS: (keyof Palette)[] = [
  'bg', 'card', 'soft', 'line', 'hover',
  'tx', 'tx2', 'tx3',
  'ok', 'warn', 'orange', 'bad', 'info', 'nodata',
];

/** Human labels for palette keys (admin UI). */
export const PALETTE_LABELS: Record<keyof Palette, string> = {
  bg: 'Фон страницы',
  card: 'Карточки',
  soft: 'Мягкий фон',
  line: 'Границы',
  hover: 'Наведение',
  tx: 'Текст основной',
  tx2: 'Текст вторичный',
  tx3: 'Текст приглушённый',
  ok: 'Норма (зелёный)',
  warn: 'Предупреждение',
  orange: 'Оранжевый',
  bad: 'Ошибка (красный)',
  info: 'Акцент',
  nodata: 'Нет данных',
};
