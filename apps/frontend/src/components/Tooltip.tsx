import { useEffect } from 'react';
import type { DayCell, ServerSummary } from '@status/shared';
import { fmtDur } from '../lib/format';

// A single fixed tooltip element (#tip), driven imperatively exactly like the
// original. Components call the exported helpers to show/move/hide it. This
// keeps the floating-tooltip behavior 1:1 (positioning, flip near right edge).

let tipEl: HTMLDivElement | null = null;

function tip(): HTMLDivElement | null {
  if (!tipEl) tipEl = document.getElementById('tip') as HTMLDivElement | null;
  return tipEl;
}

function evXY(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  const t = (e as TouchEvent).touches && (e as TouchEvent).touches[0];
  if (t) return { clientX: t.clientX, clientY: t.clientY };
  const m = e as MouseEvent;
  return { clientX: m.clientX, clientY: m.clientY };
}

export function moveTip(e: MouseEvent | TouchEvent): void {
  const el = tip();
  if (!el) return;
  const p = evXY(e);
  const w = el.offsetWidth;
  let x = p.clientX + 14;
  const y = p.clientY - 10;
  if (x + w > window.innerWidth - 8) x = p.clientX - w - 14;
  el.style.left = x + 'px';
  el.style.top = Math.max(8, y) + 'px';
}

export function hideTip(): void {
  const el = tip();
  if (el) el.style.opacity = '0';
}

function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function showTipDay(e: MouseEvent, d: DayCell): void {
  const el = tip();
  if (!el) return;
  const u = d.uptime;
  const uc =
    u === null
      ? 'var(--tx2)'
      : u >= 99.99
        ? 'var(--ok)'
        : u >= 95
          ? 'var(--warn)'
          : 'var(--bad)';
  const ut = u === null ? 'нет данных' : u.toFixed(2) + '%';
  const down = !d.hasData
    ? ''
    : d.downMin > 0
      ? '<div class="k">простой: <b style="color:var(--bad)">' +
        fmtDur(d.downMin) +
        '</b></div>'
      : d.uptime !== null && d.uptime < 100
        ? '<div class="k">кратковременный сбой</div>'
        : '<div class="k">сбоев нет</div>';
  el.innerHTML =
    '<div class="d">' +
    escapeHtml(d.label) +
    '</div><div class="k">аптайм: <b style="color:' +
    uc +
    '">' +
    ut +
    '</b></div>' +
    down;
  el.style.opacity = '1';
  moveTip(e);
}

export function showTipServer(e: MouseEvent, s: ServerSummary): void {
  const el = tip();
  if (!el) return;
  const u = s.uptime30;
  const uc =
    u === null
      ? 'var(--tx2)'
      : u >= 99.9
        ? 'var(--ok)'
        : u >= 99
          ? 'var(--warn)'
          : 'var(--bad)';
  const ut = u === null ? 'нет данных' : u.toFixed(2) + '%';
  const dm =
    s.downMin30 > 0
      ? '<b style="color:var(--bad)">' + fmtDur(s.downMin30) + '</b>'
      : '<b style="color:var(--ok)">0 мин</b>';
  el.innerHTML =
    '<div class="d">' +
    escapeHtml(s.name) +
    '</div>' +
    '<div class="k">статус: ' +
    (s.online
      ? '<b style="color:var(--ok)">онлайн</b>'
      : '<b style="color:var(--bad)">офлайн</b>') +
    '</div>' +
    '<div class="k">аптайм 30 дн: <b style="color:' +
    uc +
    '">' +
    ut +
    '</b></div>' +
    '<div class="k">общий простой: ' +
    dm +
    '</div>';
  el.style.opacity = '1';
  moveTip(e);
}

/** Raw setter used by the ping-chart scrub cursor. */
export function setTipHtml(html: string): void {
  const el = tip();
  if (!el) return;
  el.innerHTML = html;
  el.style.opacity = '1';
}

/** The single fixed tooltip node. Render once near the app root. */
export function TooltipHost() {
  // Ensure the cached ref is cleared if the host remounts (e.g. route change).
  useEffect(() => {
    tipEl = document.getElementById('tip') as HTMLDivElement | null;
    return () => {
      tipEl = null;
    };
  }, []);
  return <div id="tip" />;
}
