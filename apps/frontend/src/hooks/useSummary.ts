import { useEffect, useRef, useState } from 'react';
import type { Summary } from '@status/shared';
import { getSummary } from '../lib/api';

export type SummaryState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: Summary; error: null }
  | { status: 'error'; data: Summary | null; error: string };

/**
 * Polls /api/summary every 60s and on visibilitychange (when visible), exactly
 * like the original load()/setInterval/visibilitychange wiring.
 */
export function useSummary(): SummaryState {
  const [state, setState] = useState<SummaryState>({
    status: 'loading',
    data: null,
    error: null,
  });
  const dataRef = useRef<Summary | null>(null);

  useEffect(() => {
    let alive = true;

    const load = () => {
      getSummary()
        .then((data) => {
          if (!alive) return;
          dataRef.current = data;
          setState({ status: 'ready', data, error: null });
        })
        .catch(() => {
          if (!alive) return;
          setState({
            status: 'error',
            data: dataRef.current,
            error: 'Не удалось загрузить данные',
          });
        });
    };

    load();
    const id = window.setInterval(() => {
      if (!document.hidden) load();
    }, 60000);
    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return state;
}
