# Status Page for xray-checker

A modern status page for VPN/proxy servers, built on top of
[xray-checker](https://github.com/kutovoys/xray-checker). This is a TypeScript
rewrite of the original idea: a **NestJS** backend (storage on **LMDB**, no
SQLite) and a **React + Vite + Tailwind** frontend, with an admin panel for
branding and theming.

A row per server with a 30-day uptime bar and country flags; hovering a day
shows the date, uptime and downtime duration. Clicking any day expands a detail
view: a ping chart on a logarithmic scale (so the baseline and rare spikes are
visible at once) and downtime periods as red bands. Dark/light theme, the Inter
font with Cyrillic bundled locally, custom logo and favicon.

```
xray-checker  →  actually probes the proxies through Xray (port 2112, internal)
statuspage    →  polls the checker, keeps history in LMDB, serves the SPA + API (port 8080)
```

## ⚠️ xray-checker is required

This project **does not test anything by itself** — it is purely a status-page
layer. It periodically polls a running [xray-checker](https://github.com/kutovoys/xray-checker)
instance (`GET /api/v1/public/proxies`) and renders the result. Without a
reachable `xray-checker` at `CHECKER_URL`, the page starts but shows no servers.
You must run `xray-checker` alongside it (see the compose file below).

## Features

- 30-day uptime per server, country flags, total downtime.
- Day detail: ping chart (log scale), downtime periods, check statistics.
- "Confirmed" downtime accounting (a single blip is not counted as a full interval).
- Dark/light theme (toggle + system default), smooth animations, mobile-friendly.
- **Admin panel** (`/admin`): title/subtitle, logo & favicon upload, default theme,
  and a fully customizable color palette for both light and dark themes, with a
  live preview. Settings are stored in LMDB and applied at runtime via CSS variables.
- Improved country detection (EN + RU), any flag emoji recognized; **flags are
  downloaded at build time and served locally** (no runtime dependency on flagcdn).
- Privacy: `noindex, nofollow`, masked `Server` header, gzip responses.

## Architecture (pnpm monorepo)

```
packages/shared    shared API types + country/flag geo logic (built with tsup)
apps/backend       NestJS: poller, LMDB storage, /api/*, /api/admin/*, serves the SPA
apps/frontend      React + Vite + Tailwind v4: status page and admin panel
Dockerfile         multi-stage: build shared → frontend → backend, slim runtime
```

## Quick start (Docker)

```bash
cp .env.example .env                       # edit it; CHANGE ADMIN_PASSWORD
cp docker-compose.example.yml docker-compose.yml
# set SUBSCRIPTION_URL for your xray-checker
docker compose up -d --build
```

The page is served at `http://127.0.0.1:8080`, the admin panel at
`http://127.0.0.1:8080/admin`. Put it behind your nginx/panel with HTTPS.

> **Disable HWID for the service user.** The account whose subscription link you
> set in `SUBSCRIPTION_URL` must have **no HWID (device) limit**. xray-checker
> sends its own HWID headers; if HWID is enabled for that user, the panel returns
> a stub instead of the server list and the checker fails with
> `Error initializing configuration: no valid proxy configurations found`.
> Disable HWID on that user's card (or use a dedicated service user without a
> device limit).

### nginx reverse proxy

```nginx
server {
    listen 80;
    server_name status.your-domain.example;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
nginx -t && systemctl reload nginx
certbot --nginx -d status.your-domain.example
```

## Configuration (environment variables)

`statuspage` service:

| Variable                            | Default                    | Description                                                              |
| ----------------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| `CHECKER_URL`                       | `http://xray-checker:2112` | xray-checker address                                                     |
| `POLL_INTERVAL`                     | `60`                       | poll period in seconds (keep equal to `PROXY_CHECK_INTERVAL`)            |
| `DAYS`                              | `30`                       | days of uptime history to display                                        |
| `SAMPLE_RETAIN_DAYS`                | `DAYS+1`                   | days of per-minute samples to retain                                     |
| `TZ`                                | `Europe/Moscow`            | timezone for day boundaries and labels                                   |
| `DATA_DIR`                          | `/data`                    | directory for the LMDB store and uploaded brand images                   |
| `PORT`                              | `8080`                     | HTTP port                                                                |
| `SERVER_HEADER`                     | `nginx`                    | value of the `Server` response header (masking)                          |
| `TITLE` / `SUBTITLE`                | —                          | initial branding (only used to seed config on first start)               |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin`          | admin panel credentials — **change these**                               |
| `SESSION_SECRET`                    | —                          | secret for signing the session cookie; derived from credentials if empty |
| `LOG_LEVEL`                         | `info` (prod)              | winston log level                                                        |

After the first start, manage title/subtitle/logo/theme/palette from the
`/admin` panel — they live in the database and survive restarts.

`xray-checker` service (main ones):

| Variable                                | Default | Description                                  |
| --------------------------------------- | ------- | -------------------------------------------- |
| `SUBSCRIPTION_URL`                      | —       | subscription link(s), comma-separated        |
| `PROXY_CHECK_INTERVAL`                  | `300`   | how often proxies are tested, seconds        |
| `PROXY_TIMEOUT`                         | `30`    | per-check timeout, seconds                   |
| `PROXY_CHECK_METHOD`                    | `ip`    | method: `ip`, `status` (lighter), `download` |
| `METRICS_USERNAME` / `METRICS_PASSWORD` | —       | Basic Auth for the checker metrics/admin     |

## Storage (LMDB)

Named sub-databases in `${DATA_DIR}/status.lmdb`:

| DB        | Key              | Value                                                                          |
| --------- | ---------------- | ------------------------------------------------------------------------------ |
| `meta`    | `config`         | branding/theme config (JSON)                                                   |
| `current` | `sid`            | latest server status (`name`, `cc`, `emoji`, `online`, `latency`, `ts`, `seq`) |
| `daily`   | `${day}\|${sid}` | daily aggregate (`up`, `down`, `latSum`, `latCnt`, `downConf`)                 |
| `samples` | `[sid, ts]`      | per-minute sample (`online`, `latency`); ranged scan per day                   |

The summary is memoized per storage revision, and retention runs throttled with
ranged deletes — so polling and serving stay cheap as history grows.

## Poll frequency

Lower both intervals and keep them equal:

```yaml
xray-checker:
  environment:
    - PROXY_CHECK_INTERVAL=60
statuspage:
  environment:
    - POLL_INTERVAL=60
```

`PROXY_CHECK_INTERVAL` must be greater than `PROXY_TIMEOUT`. Practical minimum is
~30–60 seconds.

## How downtime is calculated

Downtime is counted only from consecutive failed checks: 1 failure → 0 (blip),
2 in a row → 1 interval, 3 → 2, etc. The uptime percentage accounts for all
checks, so a blip still shows in the percentage and in the tooltip as a
"short outage".

## Development

Requires Node ≥ 20 and pnpm.

```bash
pnpm install
pnpm build:shared        # the shared package must be built first
pnpm dev                 # backend (:8080) + frontend (:5173, proxies /api to :8080)
```

```bash
pnpm build                          # build all in order shared → frontend → backend
pnpm --filter @status/shared test   # country-parsing tests
pnpm typecheck                      # typecheck every package
```

Build & release helpers are in the [Makefile](Makefile) (`make help`), and a
GitHub Actions workflow builds and pushes the multi-arch image on tag push.

## Credits

This project stands on the work of others:

- **Original idea & design** — [Mrvibecodic/xray-checker-statuspage](https://github.com/Mrvibecodic/xray-checker-statuspage):
  the original status page (Python) whose UI, layout and animations this rewrite
  faithfully preserves.
- **Proxy-checking engine** — [kutovoys/xray-checker](https://github.com/kutovoys/xray-checker):
  the tool that does all the real work of probing the proxies. This project only
  draws a status page on top of it and uses the official `kutovoys/xray-checker` image.

## License

[MIT](LICENSE)

---

<sub>🤖 This project was built with the help of AI.</sub>
