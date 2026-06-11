import type { Palette } from '@status/shared';

interface Props {
  palette: Palette;
  label: string;
}

// Demo bar colors mirroring the bar thresholds (ok / warn / orange / bad /
// nodata) keyed off the previewed palette so they recolor live.
const BAR_KEYS: (keyof Palette)[] = [
  'ok',
  'ok',
  'ok',
  'warn',
  'ok',
  'orange',
  'ok',
  'ok',
  'bad',
  'ok',
  'ok',
  'nodata',
];

/** rgba() from a #rrggbb hex + alpha (best-effort; passes through if odd). */
function hexA(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * A small self-contained mock of the status card / pill / bars that renders
 * using the *given* palette (not the live CSS vars), so the admin previews a
 * palette's colors before saving. Colors are applied inline so each preview is
 * independent of the page theme.
 */
export function PalettePreview({ palette: p, label }: Props) {
  return (
    <div
      style={{
        background: p.bg,
        border: `1px solid ${p.line}`,
        borderRadius: 14,
        padding: 16,
        color: p.tx,
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <strong style={{ fontSize: 13, color: p.tx }}>{label}</strong>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            background: hexA(p.ok, 0.13),
            color: p.ok,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: p.ok,
            }}
          />
          Все системы в норме
        </span>
      </div>

      <div
        style={{
          background: p.card,
          border: `1px solid ${p.line}`,
          borderRadius: 12,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: p.ok,
            flex: 'none',
          }}
        />
        <span style={{ fontWeight: 500, color: p.tx }}>Сервер</span>
        <svg
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          style={{ flex: 1, height: 22 }}
        >
          {BAR_KEYS.map((k, i) => (
            <rect
              key={i}
              x={i * (1000 / BAR_KEYS.length) + 3}
              y="0"
              width={1000 / BAR_KEYS.length - 6}
              height="100"
              rx="7"
              fill={p[k]}
            />
          ))}
        </svg>
        <span style={{ color: p.ok, fontWeight: 600, fontSize: 12 }}>
          99.98%
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: '8px 10px',
          background: p.soft,
          borderRadius: 10,
          color: p.tx2,
          fontSize: 12,
        }}
      >
        Пинг сейчас: <b style={{ color: p.info }}>42 мс</b> · текст{' '}
        <span style={{ color: p.tx3 }}>приглушённый</span>
      </div>
    </div>
  );
}
