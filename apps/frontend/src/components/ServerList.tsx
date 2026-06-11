import type { ServerSummary } from '@status/shared';
import { ServerRow } from './ServerRow';

interface Props {
  servers: ServerSummary[];
  days: number;
  loading: boolean;
  error: string | null;
  /** Bumps when a fresh check arrives so open today-panels refresh. */
  freshTick: number;
}

export function ServerList({ servers, days, loading, error, freshTick }: Props) {
  if (loading) {
    return (
      <div id="list">
        <div className="skel">Загрузка данных…</div>
      </div>
    );
  }
  if (error && servers.length === 0) {
    return (
      <div id="list">
        <div className="skel">{error}</div>
      </div>
    );
  }
  return (
    <div id="list">
      {servers.map((s, i) => (
        // Key by sid so React diff-updates rows in place when order is
        // unchanged and rebuilds when it changes (sameOrder/buildList parity).
        <ServerRow
          key={s.sid}
          server={s}
          days={days}
          index={i}
          freshTick={freshTick}
        />
      ))}
    </div>
  );
}
