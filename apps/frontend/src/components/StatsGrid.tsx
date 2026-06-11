import type { Totals } from '@status/shared';

interface Props {
  totals: Totals | null;
  days: number;
}

/** The three stat cards. Mirrors updateTop()'s #s-online / #s-uptime / #s-ping. */
export function StatsGrid({ totals, days }: Props) {
  const online = totals ? `${totals.online} / ${totals.total}` : '—';
  const uptime =
    totals == null
      ? '—'
      : totals.uptime30 === null
        ? '—'
        : totals.uptime30.toFixed(2) + '%';
  const ping = totals && totals.avgLatency ? totals.avgLatency + ' ms' : '—';

  return (
    <div className="stats">
      <div className="stat">
        <div className="l">Серверов онлайн</div>
        <div className="v">{online}</div>
      </div>
      <div className="stat">
        <div className="l">Аптайм за {days} дн</div>
        <div className="v">{uptime}</div>
      </div>
      <div className="stat">
        <div className="l">Средний пинг</div>
        <div className="v">{ping}</div>
      </div>
    </div>
  );
}
