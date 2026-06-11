import { useEffect, useState } from 'react';
import type { PublicConfig } from '@status/shared';
import { DEFAULT_CONFIG } from '@status/shared';
import { getConfig } from '../lib/api';
import { applyPalette } from '../lib/theme';

const CONFIG_KEY = 'sp-config';

/**
 * Fetches /api/config once, applies the palette to CSS vars, and updates
 * document <title> + favicon from branding. The last-known config is cached in
 * localStorage and used as the initial value, so returning visitors render with
 * the correct branding immediately (no flash) while fresh config is fetched.
 */
export function useConfig(): { config: PublicConfig; ready: boolean } {
  const [config, setConfig] = useState<PublicConfig>(readCachedConfig);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getConfig()
      .then((cfg) => {
        if (!alive) return;
        setConfig(cfg);
        try {
          localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
        } catch {
          /* ignore quota / availability errors */
        }
      })
      .catch(() => {
        /* keep cached config / defaults */
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

  // Reveal the app (remove the bootstrap preloader) once config has resolved.
  useEffect(() => {
    if (ready) hidePreloader();
  }, [ready]);

  return { config, ready };
}

function readCachedConfig(): PublicConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PublicConfig>;
      if (parsed?.branding && parsed?.theme) return parsed as PublicConfig;
    }
  } catch {
    /* ignore parse / availability errors */
  }
  return DEFAULT_CONFIG;
}

function hidePreloader(): void {
  const el = document.getElementById('sp-preloader');
  if (!el) return;
  el.classList.add('sp-hide');
  window.setTimeout(() => el.remove(), 300);
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
