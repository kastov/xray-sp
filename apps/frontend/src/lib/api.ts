import type {
  Summary,
  DayPayload,
  PublicConfig,
  AdminConfig,
  SessionInfo,
  LoginRequest,
} from '@status/shared';

// All endpoints are same-origin relative paths, mirroring the original app.py
// routes plus the new admin surface. Admin calls send the session cookie.

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (await res.json()) as T;
}

// --- public ----------------------------------------------------------------

export const getConfig = () => getJson<PublicConfig>('/api/config');

export const getSummary = () => getJson<Summary>('/api/summary');

export const getToday = (sid: string) =>
  getJson<DayPayload>('/api/today?sid=' + encodeURIComponent(sid));

export const getDay = (sid: string, date: string) =>
  getJson<DayPayload>(
    '/api/day?sid=' + encodeURIComponent(sid) + '&date=' + encodeURIComponent(date),
  );

// --- admin -----------------------------------------------------------------

const creds: RequestInit = { credentials: 'include' };

export const getSession = () =>
  getJson<SessionInfo>('/api/admin/session', creds);

export const login = (body: LoginRequest) =>
  getJson<SessionInfo>('/api/admin/login', {
    ...creds,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export async function logout(): Promise<void> {
  await fetch('/api/admin/logout', { ...creds, method: 'POST' });
}

export const getAdminConfig = () =>
  getJson<AdminConfig>('/api/admin/config', creds);

export const saveAdminConfig = (cfg: AdminConfig) =>
  getJson<AdminConfig>('/api/admin/config', {
    ...creds,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg),
  });

export async function uploadLogo(file: File): Promise<AdminConfig> {
  const fd = new FormData();
  fd.append('file', file);
  return getJson<AdminConfig>('/api/admin/logo', {
    ...creds,
    method: 'POST',
    body: fd,
  });
}

export const removeLogo = () =>
  getJson<AdminConfig>('/api/admin/logo', { ...creds, method: 'DELETE' });
