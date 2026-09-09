# artha-web

React frontend for Artha Science. Charts and tables over the data and signals
served by `artha-platform`.

Single-user and private: no SEO, no server-side rendering, no auth flows for
other people. Built as a static bundle and served by Caddy, so nothing runs
Node on the host.

## Quick start

```bash
npm install
npm run dev     # http://localhost:5173, proxying /api to the platform stack
```

The dev server proxies `/api` and `/ready` to `http://localhost`, where the
`artha-platform` compose stack listens. Start that first, or every request
fails.

## Commands

```bash
npm run dev        # dev server with API proxy
npm run build      # typecheck, then production bundle into dist/
npm run lint       # eslint, type-aware rules
npm run typecheck  # tsc --noEmit
npm test           # vitest
```

## Deployment

`docker build` produces a Caddy image serving the built assets — no Node in
the runtime stage. The `artha-platform` compose stack pulls it as the `web`
service and routes to it from the edge proxy.

## Conventions

- **Paths are relative.** `fetch("/api/hello")`, never a configurable base
  URL. The same code works behind the dev proxy and behind Caddy, so there is
  no environment-dependent URL to get wrong.
- **The API client is the only place that talks HTTP.** Components call typed
  functions from `src/api/`, never `fetch` directly.
- Charts will use **TradingView Lightweight Charts**, plotting series the
  backend computed. Indicators are never recomputed client-side — the chart
  must show the values a rule actually fired on.
