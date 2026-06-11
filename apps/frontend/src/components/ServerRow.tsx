import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { DayPayload, ServerSummary } from '@status/shared';
import { colorFor, srvUpColor } from '../lib/format';
import { getDay, getToday } from '../lib/api';
import { hideTip, moveTip, showTipDay, showTipServer } from './Tooltip';
import { DayPanel } from './DayPanel';

interface Props {
  server: ServerSummary;
  days: number;
  /** Index for the staggered fadeUp animationDelay. */
  index: number;
  /** Bumps whenever a fresh check arrives; triggers a today-panel refresh. */
  freshTick: number;
}

const Chevron = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export function ServerRow({ server, days, index, freshTick }: Props) {
  const [open, setOpen] = useState(false);
  // selectedDay: null => today panel; a date string => that day.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [payload, setPayload] = useState<DayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const itemRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const sid = server.sid;

  // --- panel max-height animation (port of panelH / open/close logic) -------
  const measure = useCallback(() => {
    const panel = panelRef.current;
    const item = itemRef.current;
    if (!panel || !item) return;
    if (item.classList.contains('open')) {
      panel.style.maxHeight = panel.scrollHeight + 40 + 'px';
    }
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (open) {
      panel.style.maxHeight = panel.scrollHeight + 40 + 'px';
    } else {
      panel.style.maxHeight = '0px';
    }
  }, [open, payload, error]);

  // Recompute height on window resize while open (port of resize handler).
  useEffect(() => {
    if (!open) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, measure]);

  // --- data loading ----------------------------------------------------------
  const loadToday = useCallback(() => {
    setError(null);
    getToday(sid)
      .then((p) => setPayload(p))
      .catch(() => setError('Не удалось загрузить.'));
  }, [sid]);

  const loadDay = useCallback(
    (date: string) => {
      setError(null);
      getDay(sid, date)
        .then((p) => setPayload(p))
        .catch(() => setError('Не удалось загрузить.'));
    },
    [sid],
  );

  // Fetch whenever the panel opens or the selected day changes.
  useEffect(() => {
    if (!open) return;
    setPayload(null);
    if (selectedDay === null) loadToday();
    else loadDay(selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDay]);

  // Refresh an open *today* panel when a fresh check arrives (refreshPanel).
  useEffect(() => {
    if (open && selectedDay === null && freshTick > 0) {
      getToday(sid)
        .then((p) => setPayload(p))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshTick]);

  // --- handlers --------------------------------------------------------------
  const onRowClick = () => {
    hideTip();
    if (open) {
      setOpen(false);
    } else {
      setSelectedDay(null);
      setOpen(true);
    }
  };

  const onDayClick = (e: React.MouseEvent, date: string) => {
    e.stopPropagation();
    hideTip();
    setSelectedDay(date);
    setOpen(true);
  };

  // --- bars geometry (port of buildList bar layout) --------------------------
  const N = server.days.length || 1;
  const slot = 1000 / N;
  const gap = Math.min(7, slot * 0.32);

  const uptimeText =
    server.uptime30 === null ? '—' : server.uptime30.toFixed(2) + '%';
  const subText =
    (server.latencyMs ? server.latencyMs + ' ms · ' : '') + days + ' дн';

  return (
    <div
      ref={itemRef}
      className={'item' + (open ? ' open' : '')}
      style={{ animationDelay: Math.min(index * 0.04, 0.5) + 's' }}
    >
      <div className="row" onClick={onRowClick}>
        <div
          className="label"
          onMouseEnter={(e) => showTipServer(e.nativeEvent, server)}
          onMouseMove={(e) => moveTip(e.nativeEvent)}
          onMouseLeave={hideTip}
        >
          {server.cc ? (
            <img
              className="flag"
              src={`/flags/${server.cc}.svg`}
              alt={server.emoji || ''}
              loading="lazy"
              onError={(e) => {
                // Fall back to the emoji if the flag image fails to load.
                const img = e.currentTarget;
                const span = document.createElement('span');
                span.className = 'flag';
                span.style.display = 'inline-flex';
                span.style.alignItems = 'center';
                span.style.justifyContent = 'center';
                span.style.fontSize = '13px';
                span.textContent = server.emoji || '';
                img.replaceWith(span);
              }}
            />
          ) : (
            <span className="flag" />
          )}
          <div className="nm">
            <div className="name">
              <span
                className="sdot"
                style={{ background: server.online ? '#16b07a' : '#e8504e' }}
              />
              <span>{server.name}</span>
            </div>
          </div>
        </div>

        <svg
          className="bars"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
        >
          {server.days.map((d, i) => (
            <rect
              key={d.date}
              x={(i * slot + gap / 2).toFixed(2)}
              y="0"
              width={(slot - gap).toFixed(2)}
              height="100"
              rx="7"
              fill={colorFor(d)}
              onMouseEnter={(e) => showTipDay(e.nativeEvent, d)}
              onMouseMove={(e) => moveTip(e.nativeEvent)}
              onMouseLeave={hideTip}
              onClick={(e) => onDayClick(e, d.date)}
            />
          ))}
        </svg>

        <div className="stat2">
          <div className="p" style={{ color: srvUpColor(server.uptime30) }}>
            {uptimeText}
          </div>
          <div className="s">{subText}</div>
        </div>

        <div className="chev">{Chevron}</div>
      </div>

      <div className="panel" ref={panelRef}>
        {open ? (
          <DayPanel data={payload} error={error} onMeasure={measure} />
        ) : null}
      </div>
    </div>
  );
}
