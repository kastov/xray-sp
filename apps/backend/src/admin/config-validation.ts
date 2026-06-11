import { BadRequestException } from '@nestjs/common';
import type {
  AdminConfig,
  Palette,
  PublicConfig,
  ThemeMode,
} from '@status/shared';
import { PALETTE_KEYS } from '@status/shared';

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

/**
 * Loosely but safely validate a CSS color string. Accepts hex (#rgb/#rgba/
 * #rrggbb/#rrggbbaa), rgb()/rgba()/hsl()/hsla() functional notation, and a
 * conservative set of CSS named colors / keywords. Rejects anything that could
 * smuggle markup or be excessively long.
 */
const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNC_RE = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/i;
const NAMED_RE = /^[a-zA-Z]{3,30}$/;

export function isCssColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v || v.length > 64) return false;
  return HEX_RE.test(v) || FUNC_RE.test(v) || NAMED_RE.test(v);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validate a partial palette: keys must be a subset of PALETTE_KEYS; values colors. */
function validatePartialPalette(input: unknown, where: string): Partial<Palette> {
  if (!isPlainObject(input)) {
    throw new BadRequestException(`${where} must be an object`);
  }
  const allowed = new Set<string>(PALETTE_KEYS as string[]);
  const out: Partial<Palette> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) {
      throw new BadRequestException(`${where}: unknown palette key "${key}"`);
    }
    if (!isCssColor(value)) {
      throw new BadRequestException(`${where}.${key}: invalid CSS color`);
    }
    out[key as keyof Palette] = (value as string).trim();
  }
  return out;
}

function trimmedString(value: unknown, where: string, max = 200): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${where} must be a string`);
  }
  if (value.length > max) {
    throw new BadRequestException(`${where} exceeds ${max} characters`);
  }
  return value;
}

/**
 * Validate the admin PUT body and merge it onto the current stored config,
 * returning the new full config. Unknown top-level/branding fields and any
 * disallowed values are rejected. Branding.hasLogo / logoVersion are managed
 * server-side and ignored from the body.
 */
export function mergeAdminConfig(current: PublicConfig, body: unknown): AdminConfig {
  if (!isPlainObject(body)) {
    throw new BadRequestException('Body must be a JSON object');
  }

  // Start from a deep-ish clone of current config.
  const next: AdminConfig = {
    branding: { ...current.branding },
    theme: {
      ...current.theme,
      light: { ...current.theme.light },
      dark: { ...current.theme.dark },
    },
  };

  // --- branding ---
  if ('branding' in body && body.branding !== undefined) {
    const b = body.branding;
    if (!isPlainObject(b)) throw new BadRequestException('branding must be an object');
    if ('title' in b) next.branding.title = trimmedString(b.title, 'branding.title');
    if ('subtitle' in b) next.branding.subtitle = trimmedString(b.subtitle, 'branding.subtitle');
    // hasLogo / logoVersion are server-managed; silently ignore if present.
  }

  // --- theme ---
  if ('theme' in body && body.theme !== undefined) {
    const t = body.theme;
    if (!isPlainObject(t)) throw new BadRequestException('theme must be an object');

    if ('defaultTheme' in t) {
      const dt = t.defaultTheme;
      if (typeof dt !== 'string' || !THEME_MODES.includes(dt as ThemeMode)) {
        throw new BadRequestException('theme.defaultTheme must be one of light|dark|system');
      }
      next.theme.defaultTheme = dt as ThemeMode;
    }

    if ('allowToggle' in t) {
      if (typeof t.allowToggle !== 'boolean') {
        throw new BadRequestException('theme.allowToggle must be a boolean');
      }
      next.theme.allowToggle = t.allowToggle;
    }

    if ('light' in t && t.light !== undefined) {
      Object.assign(next.theme.light, validatePartialPalette(t.light, 'theme.light'));
    }
    if ('dark' in t && t.dark !== undefined) {
      Object.assign(next.theme.dark, validatePartialPalette(t.dark, 'theme.dark'));
    }
  }

  return next;
}
