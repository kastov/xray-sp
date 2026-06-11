import { useEffect, useState } from 'react';
import type { PublicConfig } from '@status/shared';
import { DEFAULT_CONFIG } from '@status/shared';
import { getConfig } from '../lib/api';
import { applyPalette } from '../lib/theme';

/**
 * Fetches /api/config once, applies the palette to CSS vars, and updates
 * document <title> + favicon from branding. Falls back to DEFAULT_CONFIG so
 * the page is fully functional even if the config endpoint is unavailable.
 */
export function useConfig(): { config: PublicConfig; ready: boolean } {
  const [config, setConfig] = useState<PublicConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getConfig()
      .then((cfg) => {
        if (!alive) return;
        setConfig(cfg);
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Apply palette + branding side-effects whenever config changes.
  useEffect(() => {
    applyPalette(config.theme);
    document.title = config.branding.title;
    updateFavicon(config.branding.hasLogo, config.branding.logoVersion);
  }, [config]);

  return { config, ready };
}

function updateFavicon(hasLogo: boolean, version: number): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!hasLogo) {
    if (link) link.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = `/favicon.png?v=${version}`;
}
