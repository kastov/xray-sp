import { useCallback, useEffect, useState } from 'react';
import type {
  AdminConfig,
  Palette,
  ThemeMode,
} from '@status/shared';
import {
  DEFAULT_DARK,
  DEFAULT_LIGHT,
  PALETTE_KEYS,
  PALETTE_LABELS,
} from '@status/shared';
import {
  getAdminConfig,
  getSession,
  login,
  logout,
  removeLogo,
  saveAdminConfig,
  uploadLogo,
} from '../lib/api';
import { useConfig } from '../hooks/useConfig';
import { useTheme } from '../hooks/useTheme';
import { ThemeToggle } from '../components/ThemeToggle';
import { PalettePreview } from '../components/PalettePreview';

type Phase = 'checking' | 'login' | 'editor';

export function AdminPage() {
  const { config } = useConfig();
  const { resolved, toggle } = useTheme(config.theme.defaultTheme);
  const [phase, setPhase] = useState<Phase>('checking');

  useEffect(() => {
    getSession()
      .then((s) => setPhase(s.authenticated ? 'editor' : 'login'))
      .catch(() => setPhase('login'));
  }, []);

  return (
    <div className="adm-wrap">
      <div className="top">
        <div className="brand">
          <div className="logo">
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
          </div>
          <div>
            <h1>Панель управления</h1>
            <p>Брендинг и оформление статус-страницы</p>
          </div>
        </div>
        <div className="topr">
          <ThemeToggle resolved={resolved} onToggle={toggle} />
        </div>
      </div>

      {phase === 'checking' && <div className="skel">Загрузка…</div>}
      {phase === 'login' && <LoginForm onSuccess={() => setPhase('editor')} />}
      {phase === 'editor' && <Editor onLogout={() => setPhase('login')} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    login({ username, password })
      .then((s) => {
        if (s.authenticated) onSuccess();
        else setErr('Неверный логин или пароль');
      })
      .catch(() => setErr('Неверный логин или пароль'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="adm-card" style={{ maxWidth: 380, margin: '0 auto' }}>
      <h2 className="adm-h2">Вход</h2>
      {err && <div className="adm-msg err">{err}</div>}
      <form onSubmit={submit}>
        <div className="adm-field">
          <label htmlFor="adm-user">Логин</label>
          <input
            id="adm-user"
            className="adm-input"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="adm-field">
          <label htmlFor="adm-pass">Пароль</label>
          <input
            id="adm-pass"
            className="adm-input"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          className="adm-btn primary"
          type="submit"
          disabled={busy}
          style={{ width: '100%' }}
        >
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function Editor({ onLogout }: { onLogout: () => void }) {
  const [cfg, setCfg] = useState<AdminConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const load = useCallback(() => {
    getAdminConfig()
      .then(setCfg)
      .catch(() =>
        setMsg({ kind: 'err', text: 'Не удалось загрузить конфигурацию' }),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doLogout = () => {
    logout().finally(onLogout);
  };

  if (!cfg) {
    return (
      <>
        {msg && <div className={'adm-msg ' + msg.kind}>{msg.text}</div>}
        <div className="skel">Загрузка конфигурации…</div>
      </>
    );
  }

  const setBranding = (patch: Partial<AdminConfig['branding']>) =>
    setCfg({ ...cfg, branding: { ...cfg.branding, ...patch } });

  const setTheme = (patch: Partial<AdminConfig['theme']>) =>
    setCfg({ ...cfg, theme: { ...cfg.theme, ...patch } });

  const setPaletteColor = (
    mode: 'light' | 'dark',
    key: keyof Palette,
    value: string,
  ) =>
    setCfg({
      ...cfg,
      theme: {
        ...cfg.theme,
        [mode]: { ...cfg.theme[mode], [key]: value },
      },
    });

  const resetPalette = (mode: 'light' | 'dark') =>
    setCfg({
      ...cfg,
      theme: {
        ...cfg.theme,
        [mode]: { ...(mode === 'light' ? DEFAULT_LIGHT : DEFAULT_DARK) },
      },
    });

  const save = () => {
    setSaving(true);
    setMsg(null);
    saveAdminConfig(cfg)
      .then((next) => {
        setCfg(next);
        setMsg({ kind: 'ok', text: 'Сохранено' });
      })
      .catch(() => setMsg({ kind: 'err', text: 'Не удалось сохранить' }))
      .finally(() => setSaving(false));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && <div className={'adm-msg ' + msg.kind}>{msg.text}</div>}

      {/* Branding ----------------------------------------------------------- */}
      <div className="adm-card adm-section" style={{ marginBottom: 0 }}>
        <h2 className="adm-h2">Брендинг</h2>
        <div className="adm-field">
          <label htmlFor="b-title">Заголовок</label>
          <input
            id="b-title"
            className="adm-input"
            value={cfg.branding.title}
            onChange={(e) => setBranding({ title: e.target.value })}
          />
        </div>
        <div className="adm-field">
          <label htmlFor="b-sub">Подзаголовок</label>
          <input
            id="b-sub"
            className="adm-input"
            value={cfg.branding.subtitle}
            onChange={(e) => setBranding({ subtitle: e.target.value })}
          />
        </div>
        <LogoUploader
          hasLogo={cfg.branding.hasLogo}
          version={cfg.branding.logoVersion}
          onChange={(next) => setCfg(next)}
          onError={(text) => setMsg({ kind: 'err', text })}
        />
      </div>

      {/* Theme -------------------------------------------------------------- */}
      <div className="adm-card adm-section" style={{ marginBottom: 0 }}>
        <h2 className="adm-h2">Тема</h2>
        <div className="adm-field">
          <label htmlFor="t-default">Тема по умолчанию</label>
          <select
            id="t-default"
            className="adm-input"
            value={cfg.theme.defaultTheme}
            onChange={(e) =>
              setTheme({ defaultTheme: e.target.value as ThemeMode })
            }
          >
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
            <option value="system">Системная</option>
          </select>
        </div>
        <label className="adm-switch">
          <input
            type="checkbox"
            checked={cfg.theme.allowToggle}
            onChange={(e) => setTheme({ allowToggle: e.target.checked })}
          />
          <span className="track" />
          <span>Показывать переключатель темы</span>
        </label>
      </div>

      {/* Palettes ----------------------------------------------------------- */}
      <PaletteEditor
        mode="light"
        palette={cfg.theme.light}
        onColor={(k, v) => setPaletteColor('light', k, v)}
        onReset={() => resetPalette('light')}
      />
      <PaletteEditor
        mode="dark"
        palette={cfg.theme.dark}
        onColor={(k, v) => setPaletteColor('dark', k, v)}
        onReset={() => resetPalette('dark')}
      />

      {/* Actions ------------------------------------------------------------ */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <button className="adm-btn danger" onClick={doLogout}>
          Выйти
        </button>
        <button className="adm-btn primary" onClick={save} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Palette editor (per mode) with live preview
// ---------------------------------------------------------------------------

function PaletteEditor({
  mode,
  palette,
  onColor,
  onReset,
}: {
  mode: 'light' | 'dark';
  palette: Palette;
  onColor: (key: keyof Palette, value: string) => void;
  onReset: () => void;
}) {
  const title = mode === 'light' ? 'Палитра — светлая' : 'Палитра — тёмная';
  return (
    <div className="adm-card adm-section" style={{ marginBottom: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <h2 className="adm-h2" style={{ margin: 0 }}>
          {title}
        </h2>
        <button className="adm-btn" onClick={onReset}>
          Сбросить
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <PalettePreview palette={palette} label="Предпросмотр" />
      </div>

      <div className="adm-pgrid">
        {PALETTE_KEYS.map((key) => (
          <div className="adm-prow" key={key}>
            <span className="lbl">{PALETTE_LABELS[key]}</span>
            <input
              type="color"
              className="adm-color"
              value={normalizeHex(palette[key])}
              onChange={(e) => onColor(key, e.target.value)}
              aria-label={PALETTE_LABELS[key]}
            />
            <input
              type="text"
              className="adm-hex"
              value={palette[key]}
              onChange={(e) => onColor(key, e.target.value)}
              spellCheck={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** <input type="color"> only accepts #rrggbb; coerce best-effort. */
function normalizeHex(v: string): string {
  const s = v.trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s;
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return (
      '#' +
      s[1] +
      s[1] +
      s[2] +
      s[2] +
      s[3] +
      s[3]
    );
  }
  return '#000000';
}

// ---------------------------------------------------------------------------
// Logo uploader (drag/drop + file input)
// ---------------------------------------------------------------------------

function LogoUploader({
  hasLogo,
  version,
  onChange,
  onError,
}: {
  hasLogo: boolean;
  version: number;
  onChange: (cfg: AdminConfig) => void;
  onError: (text: string) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    setBusy(true);
    uploadLogo(file)
      .then(onChange)
      .catch(() => onError('Не удалось загрузить логотип'))
      .finally(() => setBusy(false));
  };

  const remove = () => {
    setBusy(true);
    removeLogo()
      .then(onChange)
      .catch(() => onError('Не удалось удалить логотип'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="adm-field">
      <label>Логотип</label>
      {hasLogo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <img
            src={`/logo?v=${version}`}
            alt=""
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              objectFit: 'cover',
              border: '1px solid var(--line)',
            }}
          />
          <button className="adm-btn danger" onClick={remove} disabled={busy}>
            Удалить
          </button>
        </div>
      )}
      <label
        className={'adm-drop' + (drag ? ' drag' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        {busy
          ? 'Загрузка…'
          : 'Перетащите изображение сюда или нажмите для выбора'}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
