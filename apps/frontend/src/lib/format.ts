import type { DayCell } from '@status/shared';

// Ported 1:1 from the original INDEX_HTML JS (colorFor / fmtDur / fmtTime).
// The bar colors use the same bright hard-coded values as the original so the
// 30-day bars stay visually identical regardless of palette tweaks.

export const GREY = '#cfd6df';

export function colorFor(d: DayCell): string {
  if (!d.hasData) return GREY;
  if (d.downMin <= 0) return '#16b07a';
  if (d.downMin <= 30) return '#f0a82a';
  if (d.downMin < 120) return '#e3692f';
  return '#e8504e';
}

export function fmtDur(m: number): string {
  if (m <= 0) return '0 мин';
  if (m >= 1440) {
    const dd = Math.floor(m / 1440);
    const h = Math.round((m % 1440) / 60);
    return dd + ' дн' + (h ? ' ' + h + ' ч' : '');
  }
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h + ' ч' + (mm ? ' ' + mm + ' мин' : '');
  }
  return m + ' мин';
}

export function fmtTime(ts: number, ds: number): string {
  const off = ts - ds;
  const h = Math.floor(off / 3600);
  const m = Math.floor((off % 3600) / 60);
  return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
}

/** Server uptime-30 color, ported from srvUpColor(). */
export function srvUpColor(u: number | null): string {
  return u === null
    ? 'var(--tx2)'
    : u >= 99.9
      ? 'var(--ok)'
      : u >= 99
        ? 'var(--warn)'
        : 'var(--bad)';
}
