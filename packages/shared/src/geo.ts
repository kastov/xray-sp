import { COUNTRIES, ISO_CODES } from './countries.js';
import { ISO_ALPHA2 } from './iso.js';

export interface GeoResult {
  /** ISO 3166-1 alpha-2 (lowercase), or '' when unknown. */
  cc: string;
  /** Flag emoji, or '' when unknown. */
  emoji: string;
  /** Cleaned display name (flag emoji / country-code prefix stripped). */
  name: string;
}

// Regional Indicator Symbols: U+1F1E6 (🇦) .. U+1F1FF (🇿).
const RI_BASE = 0x1f1e6;
const RI_A = 'a'.charCodeAt(0);

/** Convert a lowercase ISO alpha-2 code to its flag emoji (e.g. "nl" → 🇳🇱). */
export function ccToEmoji(cc: string): string {
  if (!cc || cc.length !== 2) return '';
  const a = cc.toLowerCase();
  const c0 = a.charCodeAt(0) - RI_A;
  const c1 = a.charCodeAt(1) - RI_A;
  if (c0 < 0 || c0 > 25 || c1 < 0 || c1 > 25) return '';
  return String.fromCodePoint(RI_BASE + c0, RI_BASE + c1);
}

/** Extract an ISO alpha-2 code from a leading flag emoji, or '' if none. */
export function emojiToCc(text: string): string {
  const cps = Array.from(text);
  for (let i = 0; i < cps.length - 1; i++) {
    const a = cps[i].codePointAt(0)!;
    const b = cps[i + 1].codePointAt(0)!;
    if (a >= RI_BASE && a <= RI_BASE + 25 && b >= RI_BASE && b <= RI_BASE + 25) {
      const cc = String.fromCharCode(RI_A + (a - RI_BASE), RI_A + (b - RI_BASE));
      // Normalize UK → GB which Unicode encodes as 🇬🇧 already; keep as-is.
      return cc;
    }
  }
  return '';
}

const LETTER_RE = /[a-zа-яё0-9]/i;

/**
 * True when `kw` starts at a word boundary in `hay` (prefix semantics).
 * Right boundary is intentionally NOT required so Russian stems like "герман"
 * match the inflected "Германия". Collisions (e.g. india/indiana) are resolved
 * by the longest-match-wins rule plus explicit longer city keywords.
 */
function hasWord(hay: string, kw: string): boolean {
  let from = 0;
  for (;;) {
    const idx = hay.indexOf(kw, from);
    if (idx === -1) return false;
    const before = idx > 0 ? hay[idx - 1] : '';
    if (!before || !LETTER_RE.test(before)) return true;
    from = idx + 1;
  }
}

/**
 * Detect the country code for a server name.
 * Priority: explicit flag emoji → standalone ISO token → longest keyword match.
 */
export function detectCc(rawName: string): string {
  const name = (rawName || '').toLowerCase();

  // 1) Flag emoji already present in the name — valid for ANY country.
  const fromEmoji = emojiToCc(rawName || '');
  if (fromEmoji && ISO_ALPHA2.has(fromEmoji)) return fromEmoji;

  // 2) Standalone 2-letter ISO token (e.g. "NL-1", "DE | Frankfurt", "US 2").
  const tokens = name.split(/[^a-z]+/).filter(Boolean);
  for (const t of tokens) {
    if (t.length === 2 && ISO_CODES.has(t)) return t;
    // common alias: "uk" → gb
    if (t === 'uk') return 'gb';
  }

  // 3) Keyword match — longest matching keyword wins (reduces false positives).
  let best = '';
  let bestLen = 0;
  for (const c of COUNTRIES) {
    for (const kw of c.kw) {
      if (kw.length > bestLen && hasWord(name, kw)) {
        best = c.cc;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

const FLAG_EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]/gu;
const VARIATION_RE = /[︎️‍]/g;

/**
 * Clean a raw server name for display: strip any leading flag emoji and a
 * leading country-code / abbreviation token, then collapse separators.
 */
export function cleanName(rawName: string, cc: string): string {
  if (!rawName) return rawName;
  let s = rawName.replace(FLAG_EMOJI_RE, '').replace(VARIATION_RE, '').trim();

  // Strip a leading short token when it is a known ISO code, the detected cc,
  // or an all-caps abbreviation, followed by a separator.
  const m = s.match(/^([A-Za-z]{2,3})[\s\-_|.,]+(.+)$/);
  if (m) {
    const head = m[1];
    const lower = head.toLowerCase();
    const isCode = ISO_CODES.has(lower) || lower === cc || (lower === 'uk' && cc === 'gb');
    // Only strip a bare uppercase abbreviation when a country was detected, to
    // avoid eating meaningful prefixes like "VPN" on unrecognized names.
    const isUpper = !!cc && head === head.toUpperCase();
    if (isCode || isUpper) s = m[2].trim();
  }

  // Collapse leftover separators / whitespace.
  s = s.replace(/\s{2,}/g, ' ').replace(/^[\s\-_|.,]+|[\s\-_|.,]+$/g, '').trim();
  return s || rawName.replace(FLAG_EMOJI_RE, '').replace(VARIATION_RE, '').trim() || rawName;
}

/** Full geo resolution for a raw server name. */
export function resolveGeo(rawName: string): GeoResult {
  const cc = detectCc(rawName);
  return {
    cc,
    emoji: ccToEmoji(cc),
    name: cleanName(rawName, cc),
  };
}
