import { useEffect, useRef } from 'react';
import type { DayPayload } from '@status/shared';
import { fmtTime } from '../lib/format';
import { hideTip, moveTip, setTipHtml } from './Tooltip';

interface Props {
  /** null = still loading; loaded payload otherwise. */
  data: DayPayload | null;
  /** Error message to show instead of the chart. */
  error?: string | null;
  /** Notify parent so it can recompute the panel max-height after render. */
  onMeasure?: () => void;
}

/**
 * The per-day detail panel with the logarithmic ping line chart. This is a
 * direct port of the original renderToday(): log-scale Y ticks, gradient area,
 * red downtime bands, "now" dashed line, 2x-zoom horizontal scroll auto-centered
 * on "now", and cursor scrubbing + tooltip (mouse + touch).
 *
 * Implemented imperatively (innerHTML + event wiring) inside a ref so the chart
 * math and DOM match the original 1:1. Horizontal scroll position is preserved
 * across re-renders (refresh) when `isToday` already has a stored offset.
 */
export function DayPanel({ data, error, onMeasure }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Preserve scrollLeft across refresh re-renders (refreshPanel behavior).
  const keepScroll = useRef<number | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (error) {
      host.innerHTML = '<div class="empty">' + escapeHtml(error) + '</div>';
      onMeasure?.();
      return;
    }
    if (!data) {
      host.innerHTML = '<div class="empty">Загрузка…</div>';
      onMeasure?.();
      return;
    }

    const cleanup = renderToday(host, data, keepScroll, onMeasure);
    return cleanup;
  }, [data, error, onMeasure]);

  return <div ref={hostRef} />;
}

function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// Direct port of the original renderToday(panel, data). Returns a cleanup fn.
function renderToday(
  panel: HTMLElement,
  data: DayPayload,
  keepScroll: { current: number | null },
  onMeasure?: () => void,
): () => void {
  const head = data.dayLabel || 'Сегодня';

  if (!data.samples.length) {
    panel.innerHTML =
      '<div class="phead">' +
      escapeHtml(head) +
      '</div><div class="empty">Данных за этот день нет.</div>';
    onMeasure?.();
    return () => {};
  }

  const ds = data.dayStart;
  const span = 86400;
  const W = 1000;
  const chartTop = 10;
  const base = 150;
  const H = 150;
  const chartH = base - chartTop;
  const sw = Math.max(1.5, (data.pollInterval / span) * W);

  let bands = '';
  let runStart: number | null = null;
  let runEnd = 0;
  const ptsRaw: [number, number][] = [];

  function flush() {
    if (runStart !== null) {
      bands +=
        '<rect x="' +
        runStart.toFixed(1) +
        '" y="0" width="' +
        Math.max(1.5, runEnd - runStart).toFixed(1) +
        '" height="' +
        H +
        '" fill="rgba(232,80,80,.18)"/>';
      runStart = null;
    }
  }

  data.samples.forEach((s) => {
    const x = ((s.ts - ds) / span) * W;
    if (s.online) {
      flush();
      if (s.latency > 0) ptsRaw.push([x, s.latency]);
    } else {
      if (runStart === null) runStart = x;
      runEnd = x + sw;
    }
  });
  flush();

  function niceLo(v: number): number {
    const e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10 + 1e-9));
    const m = v / e;
    return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * e;
  }
  function niceHi(v: number): number {
    const e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10 + 1e-9));
    const m = v / e;
    return (m <= 1.0001 ? 1 : m <= 2.0001 ? 2 : m <= 5.0001 ? 5 : 10) * e;
  }

  const pmin = data.stats.pmin || 50;
  const pmax = data.stats.pmax || 100;
  const lo = niceLo(Math.max(10, pmin));
  const hi = niceHi(Math.max(pmax, lo * 4));
  const L0 = Math.log(lo);
  const LR = Math.log(hi) - L0 || 1;

  function yOf(v: number): number {
    const vv = v < lo ? lo : v > hi ? hi : v;
    return base - ((Math.log(vv) - L0) / LR) * chartH;
  }

  const pts = ptsRaw.map((p): [number, number] => [p[0], yOf(p[1])]);

  const ticks: number[] = [];
  let t = lo;
  let tg = 0;
  while (t <= hi * 1.0001 && tg++ < 40) {
    ticks.push(t);
    const te = Math.pow(10, Math.floor(Math.log(t) / Math.LN10 + 1e-9));
    const tm = t / te;
    t = (tm < 1.5 ? 2 : tm < 3.5 ? 5 : 10) * te;
  }

  let grid = '';
  let yl = '';
  ticks.forEach((tk) => {
    const ty = yOf(tk);
    grid +=
      '<line x1="0" y1="' +
      ty.toFixed(1) +
      '" x2="1000" y2="' +
      ty.toFixed(1) +
      '" stroke="var(--line)" stroke-width="1"/>';
    yl +=
      '<div class="tyaxis" style="top:' +
      ty.toFixed(1) +
      'px">' +
      tk +
      '</div>';
  });

  const poly = pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1));
  const line = pts.length
    ? '<polyline points="' +
      poly.join(' ') +
      '" fill="none" stroke="#2f6bff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>'
    : '';
  const area = pts.length
    ? '<path d="M' +
      pts[0][0].toFixed(1) +
      ',' +
      base +
      ' L' +
      poly.join(' L') +
      ' L' +
      pts[pts.length - 1][0].toFixed(1) +
      ',' +
      base +
      ' Z" fill="url(#pgrad)"/>'
    : '';

  let nowLine = '';
  if (data.isToday) {
    const nowX = ((data.now - ds) / span) * W;
    nowLine =
      '<line x1="' +
      nowX.toFixed(1) +
      '" y1="0" x2="' +
      nowX.toFixed(1) +
      '" y2="' +
      base +
      '" stroke="var(--tx3)" stroke-width="1" stroke-dasharray="4 4"/>';
  }

  const svg =
    '<svg viewBox="0 0 1000 ' +
    H +
    '" preserveAspectRatio="none" class="tchart">' +
    '<defs><linearGradient id="pgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6bff" stop-opacity="0.20"/><stop offset="1" stop-color="#2f6bff" stop-opacity="0"/></linearGradient></defs>' +
    grid +
    area +
    bands +
    line +
    nowLine +
    '<line class="cursor" x1="0" y1="0" x2="0" y2="' +
    base +
    '" stroke="var(--tx2)" stroke-width="1" opacity="0"/>' +
    '</svg>';

  const zoom = 2;
  let axis = '';
  for (let h2 = 0; h2 <= 24; h2 += 3) {
    axis += '<span>' + ('0' + h2).slice(-2) + ':00</span>';
  }

  const st = data.stats;
  const last = data.samples[data.samples.length - 1];
  const stats =
    '<div class="tstats">' +
    '<div><span>' +
    (data.isToday ? 'Проверок сегодня' : 'Проверок за день') +
    '</span><b>' +
    st.checks +
    '</b></div>' +
    '<div><span>Ошибок опроса</span><b style="color:' +
    (st.errors ? 'var(--bad)' : 'var(--ok)') +
    '">' +
    st.errors +
    '</b></div>' +
    '<div><span>' +
    (data.isToday ? 'Пинг сейчас' : 'Последний пинг') +
    '</span><b>' +
    (last.online ? last.latency + ' мс' : '—') +
    '</b></div>' +
    '<div><span>Пинг мин / сред / макс</span><b>' +
    (st.pavg ? st.pmin + ' / ' + st.pavg + ' / ' + st.pmax + ' мс' : '—') +
    '</b></div>' +
    '</div>';

  const cap =
    'Пинг, мс · логарифмическая шкала · макс ' + (data.stats.pmax || 0) + ' мс';

  panel.innerHTML =
    '<div class="phead">' +
    escapeHtml(head) +
    ' · синяя линия — пинг, красные полосы — периоды сбоев</div>' +
    stats +
    '<div class="tcaption">' +
    cap +
    '</div>' +
    '<div class="tchartwrap">' +
    '<div class="tscroll"><div class="tcanvas" style="width:' +
    zoom * 100 +
    '%">' +
    svg +
    '<div class="taxis">' +
    axis +
    '</div></div></div>' +
    yl +
    '</div>';

  const sc = panel.querySelector<HTMLElement>('.tscroll');
  if (sc) {
    if (keepScroll.current !== null) {
      // Preserve scroll across a refresh (refreshPanel behavior).
      sc.scrollLeft = keepScroll.current;
    } else if (data.isToday) {
      const nf = (data.now - ds) / span;
      const tgt = nf * sc.scrollWidth - sc.clientWidth / 2;
      sc.scrollLeft = Math.max(0, Math.min(tgt, sc.scrollWidth - sc.clientWidth));
    } else {
      sc.scrollLeft = 0;
    }
  }

  const svgEl = panel.querySelector<SVGSVGElement>('svg')!;
  const cursor = svgEl.querySelector<SVGLineElement>('.cursor')!;
  const samples = data.samples;

  function scrub(cx: number, ev: MouseEvent | Touch | TouchEvent) {
    const r = svgEl.getBoundingClientRect();
    let frac = (cx - r.left) / r.width;
    if (frac < 0) frac = 0;
    if (frac > 1) frac = 1;
    const ts = ds + frac * span;
    let best = null;
    let bd = 1e15;
    for (let i = 0; i < samples.length; i++) {
      const dd = Math.abs(samples[i].ts - ts);
      if (dd < bd) {
        bd = dd;
        best = samples[i];
      }
    }
    if (!best) return;
    const x = ((best.ts - ds) / span) * 1000;
    cursor.setAttribute('x1', String(x));
    cursor.setAttribute('x2', String(x));
    cursor.setAttribute('opacity', '1');
    setTipHtml(
      '<div class="d">' +
        fmtTime(best.ts, ds) +
        '</div>' +
        (best.online
          ? '<div class="k">опрос: <b style="color:var(--ok)">успешно</b></div><div class="k">пинг: <b>' +
            best.latency +
            ' мс</b></div>'
          : '<div class="k"><b style="color:var(--bad)">ошибка опроса</b></div>'),
    );
    moveTip(ev as MouseEvent);
  }

  const onMove = (e: MouseEvent) => scrub(e.clientX, e);
  const onLeave = () => {
    cursor.setAttribute('opacity', '0');
    hideTip();
  };

  let td: { x: number; y: number; m: boolean } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    const t0 = e.touches[0];
    if (!t0) return;
    td = { x: t0.clientX, y: t0.clientY, m: false };
    scrub(t0.clientX, t0);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!td) return;
    const t0 = e.touches[0];
    if (!t0) return;
    if (!td.m && (Math.abs(t0.clientX - td.x) > 8 || Math.abs(t0.clientY - td.y) > 8)) {
      td.m = true;
      cursor.setAttribute('opacity', '0');
      hideTip();
    }
  };
  const onTouchEnd = () => {
    td = null;
  };

  svgEl.addEventListener('mousemove', onMove);
  svgEl.addEventListener('mouseleave', onLeave);
  svgEl.addEventListener('touchstart', onTouchStart, { passive: true });
  svgEl.addEventListener('touchmove', onTouchMove, { passive: true });
  svgEl.addEventListener('touchend', onTouchEnd, { passive: true });

  // Track scroll position so the next refresh re-render preserves it.
  const onScroll = () => {
    keepScroll.current = sc ? sc.scrollLeft : null;
  };
  if (sc) sc.addEventListener('scroll', onScroll, { passive: true });

  onMeasure?.();

  return () => {
    svgEl.removeEventListener('mousemove', onMove);
    svgEl.removeEventListener('mouseleave', onLeave);
    svgEl.removeEventListener('touchstart', onTouchStart);
    svgEl.removeEventListener('touchmove', onTouchMove);
    svgEl.removeEventListener('touchend', onTouchEnd);
    if (sc) sc.removeEventListener('scroll', onScroll);
  };
}
