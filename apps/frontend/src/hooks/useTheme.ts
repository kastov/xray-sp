import { useCallback, useEffect, useState } from 'react';
import type { ThemeMode } from '@status/shared';
import {
  THEME_KEY,
  currentResolvedTheme,
  resolveInitialTheme,
  setThemeAttr,
} from '../lib/theme';

/**
 * Manages the light/dark <html data-theme> attribute. Honors the config
 * defaultTheme on first paint and persists manual toggles under "sp-theme"
 * (same key as the original). Toggling sets an explicit override.
 */
export function useTheme(defaultTheme: ThemeMode) {
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    currentResolvedTheme(),
  );

  // Apply the config default once it's known, unless the user has an override
  // already persisted (the inline script in index.html may have set it).
  useEffect(() => {
    const initial = resolveInitialTheme(defaultTheme);
    setThemeAttr(initial);
    setResolved(currentResolvedTheme());
  }, [defaultTheme]);

  // Reflect system changes while in 'system' mode (no explicit attribute).
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(currentResolvedTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = currentResolvedTheme() === 'dark' ? 'light' : 'dark';
    setThemeAttr(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    setResolved(next);
  }, []);

  return { resolved, toggle };
}
