import type { Totals } from '@status/shared';

interface Props {
  totals: Totals | null;
}

/** The overall-status pill. Mirrors updateTop()'s #overall logic. */
export function StatPill({ totals }: Props) {
  if (!totals) {
    return (
      <div className="pill ok">
        <span className="dot" />
        <span>Загрузка…</span>
      </div>
    );
  }
  const allUp = totals.online === totals.total && totals.total > 0;
  return (
    <div className={'pill ' + (allUp ? 'ok' : 'bad')}>
      <span className="dot" style={{ background: 'currentColor' }} />
      <span>
        {allUp
          ? 'Все системы в норме'
          : totals.total - totals.online + ' сервер(ов) недоступно'}
      </span>
    </div>
  );
}
