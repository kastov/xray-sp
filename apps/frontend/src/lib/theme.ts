import type { Palette, ThemeConfig, ThemeMode } from '@status/shared';
import { PALETTE_KEYS } from '@status/shared';

// Runtime palette application. The page ships with seed CSS vars (index.css) so
// it renders instantly, then we inject the config-driven palette so the admin
// can recolor both light and dark themes. We do this by emitting a <style>
// block scoped to :root[data-theme] selectors plus the prefers-color-scheme
// fallback — this keeps per-theme palettes correct no matter which theme the
// user has toggled to.

const STYLE_ID = 'sp-palette';

function paletteVars(p: Palette): string {
  return PALETTE_KEYS.map((k) => `--${k}:${p[k]};`).join('');
}

/** Inject both light & dark palettes from config as CSS custom properties. */
export function applyPalette(theme: ThemeConfig): void {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  const light = paletteVars(theme.light);
  const dark = paletteVars(theme.dark);
  el.textContent = [
    `:root,html[data-theme="light"]{${light}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme]){${dark}}}`,
    `html[data-theme="dark"]{${dark}}`,
  ].join('\n');
}

export const THEME_KEY = 'sp-theme';

export function storedTheme(): 'light' | 'dark' | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/** Resolve the effective theme attribute, honoring config default + override. */
export function resolveInitialTheme(
  defaultTheme: ThemeMode,
): 'light' | 'dark' | null {
  const override = storedTheme();
  if (override) return override;
  if (defaultTheme === 'light' || defaultTheme === 'dark') return defaultTheme;
  return null; // 'system' -> no attribute, let prefers-color-scheme decide
}

export function setThemeAttr(theme: 'light' | 'dark' | null): void {
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme');
}

export function currentResolvedTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return systemPrefersDark() ? 'dark' : 'light';
}
