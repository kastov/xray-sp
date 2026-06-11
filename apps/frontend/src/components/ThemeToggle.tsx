interface Props {
  resolved: 'light' | 'dark';
  onToggle: () => void;
}

// Sun/moon icons ported 1:1 from the original. Show SUN while dark (click ->
// light), MOON while light (click -> dark).
const Sun = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const Moon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export function ThemeToggle({ resolved, onToggle }: Props) {
  return (
    <button
      className="tbtn"
      aria-label="Сменить тему"
      title="Сменить тему"
      onClick={onToggle}
    >
      {resolved === 'dark' ? Sun : Moon}
    </button>
  );
}
