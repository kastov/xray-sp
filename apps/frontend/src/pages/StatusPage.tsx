import { useEffect, useRef, useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import { useSummary } from '../hooks/useSummary';
import { useTheme } from '../hooks/useTheme';
import { Header } from '../components/Header';
import { StatsGrid } from '../components/StatsGrid';
import { ServerList } from '../components/ServerList';
import { TooltipHost } from '../components/Tooltip';

export function StatusPage() {
  const { config } = useConfig();
  const { resolved, toggle } = useTheme(config.theme.defaultTheme);
  const summary = useSummary();

  const data = summary.data;
  const days = data?.days ?? 30;

  // Track lastCheck to produce a "fresh check" tick (refreshPanel trigger).
  const [freshTick, setFreshTick] = useState(0);
  const lastSeen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!data) return;
    if (lastSeen.current !== undefined && data.lastCheck !== lastSeen.current) {
      setFreshTick((n) => n + 1);
    }
    lastSeen.current = data.lastCheck;
  }, [data]);

  const totals = data?.totals ?? null;

  // Footer: "последняя проверка … · интервал N мин" (port of #foot).
  const foot = data
    ? (data.lastCheck
        ? 'последняя проверка ' + data.lastCheck
        : 'ожидание первой проверки') +
      ' · интервал ' +
      Math.round((data.pollInterval / 60) * 10) / 10 +
      ' мин'
    : '';

  return (
    <div className="wrap">
      <Header
        branding={config.branding}
        theme={config.theme}
        totals={totals}
        resolved={resolved}
        onToggle={toggle}
      />

      <StatsGrid totals={totals} days={days} />

      <ServerList
        servers={data?.servers ?? []}
        days={days}
        loading={summary.status === 'loading'}
        error={summary.status === 'error' ? summary.error : null}
        freshTick={freshTick}
      />

      <div className="legend">
        <span>
          <i style={{ background: '#16b07a' }} />
          норма
        </span>
        <span>
          <i style={{ background: '#f0a82a' }} />
          до 30 мин
        </span>
        <span>
          <i style={{ background: '#e3692f' }} />
          30 мин – 2 ч
        </span>
        <span>
          <i style={{ background: '#e8504e' }} />
          от 2 ч
        </span>
        <span>
          <i style={{ background: '#cfd6df' }} />
          нет данных
        </span>
        <span className="right">← {days} дней назад · сегодня →</span>
      </div>

      <div className="foot">{foot}</div>

      <TooltipHost />
    </div>
  );
}
