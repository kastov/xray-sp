import type { BrandingConfig, ThemeConfig, Totals } from '@status/shared';
import { StatPill } from './StatPill';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  branding: BrandingConfig;
  theme: ThemeConfig;
  totals: Totals | null;
  resolved: 'light' | 'dark';
  onToggle: () => void;
}

// Default shield SVG, ported 1:1 from DEFAULT_LOGO_SVG in app.py.
const DefaultLogo = (
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export function Header({ branding, theme, totals, resolved, onToggle }: Props) {
  return (
    <div className="top">
      <div className="brand">
        <div className="logo">
          {branding.hasLogo ? (
            <img
              src={`/logo?v=${branding.logoVersion}`}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 'inherit',
              }}
            />
          ) : (
            DefaultLogo
          )}
        </div>
        <div>
          <h1>{branding.title}</h1>
          <p>{branding.subtitle}</p>
        </div>
      </div>
      <div className="topr">
        <StatPill totals={totals} />
        {theme.allowToggle && (
          <ThemeToggle resolved={resolved} onToggle={onToggle} />
        )}
      </div>
    </div>
  );
}
