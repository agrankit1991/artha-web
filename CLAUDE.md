# CLAUDE.md — artha-web

Guidance for working in this repository.

## What this is

React SPA for Artha Science, consuming the `artha-platform` API. Private and
single-user: no SEO, no SSR, no multi-tenant auth. Built to static files and
served by Caddy.

Platform-level decisions and their reasoning are in `../PLATFORM-DECISIONS.md`.

## Commands

`npm run verify` is the gate. It is what the pre-push hook runs and what CI
runs, so a green local run means a green pipeline.

```bash
npm install
npm run verify       # check + coverage thresholds + dependency audit
npm run check        # format, lint, types (pre-commit runs this)
npm run format       # apply Prettier
npm run coverage     # tests with thresholds enforced
npm run dev          # needs the artha-platform compose stack on :80
```

Install the hooks once per clone: `git config core.hooksPath .githooks`.

**Run `npm run verify` before every commit.** The hooks enforce it, but do
not rely on them alone — `--no-verify` exists and CI is a slow way to find
out.

## Quality gate

| Check        | Tool                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- |
| Formatting   | Prettier (ESLint defers via `eslint-config-prettier`)                                   |
| Lint         | ESLint with `strictTypeChecked` + react-hooks                                           |
| Types        | `tsc --noEmit`, strict plus `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` |
| Coverage     | Vitest v8 provider, lines/branches/functions/statements                                 |
| Dependencies | `npm audit --audit-level=high`                                                          |

**Audit level is `high`, deliberately.** Dev dependencies never reach the
browser in a static bundle, and blocking on every moderate advisory in the
test toolchain trains people to ignore the audit. High and critical block.

### Coverage ratchet

Currently **95%** on lines, branches, functions and statements, configured in
`vite.config.ts`. Actual coverage is 100% on every measure.

**The bar only ever goes up.** Raise it to just under the current figure in
the same commit that adds the tests. Never lower it to make a build pass.
It stays at 95% as real views are added.

## Rules

- **Relative API paths only.** `fetch("/api/…")`. No base-URL environment
  variable: the dev proxy and Caddy both serve the API on the same origin, so
  introducing one only creates a way to misconfigure it.
- **All HTTP goes through `src/api/`.** Components call typed functions; they
  never call `fetch` themselves. When the API grows, generate that layer from
  the platform's OpenAPI schema so the contract is a build artifact rather
  than something two repositories agree on by hand.
- **Charts plot server-computed series.** TradingView Lightweight Charts, not
  Advanced Charts — the latter carries its own indicator engine, which would
  duplicate the rule engine and quietly disagree with it on warm-up periods,
  gaps and corporate-action adjustment. The chart's job is to show why a
  signal fired, so it must display the values the rule actually used.
- TypeScript is strict, including `exactOptionalPropertyTypes` and
  `noUncheckedIndexedAccess`. ESLint runs type-aware rules.

## Gotchas

- **Vitest and Vite majors must match.** Vitest 2 bundles Vite 5; with Vite 6
  that produces two copies of Vite's types and `defineConfig` fails to
  typecheck under `exactOptionalPropertyTypes`. Vitest 3 pairs with Vite 6.
- **Import `defineConfig` from `vitest/config`,** not `vite`, or the `test`
  key is rejected as an unknown property.
- `npm install` warns that esbuild's postinstall was skipped. Benign —
  esbuild ships prebuilt binaries through optional dependencies.
- `index.html` must be served `no-cache` while hashed assets are immutable,
  or a deploy stays invisible until browser caches expire. That is configured
  in `Caddyfile`.

## Not yet built

Everything past the placeholder shell: routing, the instrument and signal
views, Lightweight Charts integration, TanStack Table. `src/App.tsx` exists
only to prove the deployed frontend reaches the API through the same proxy
that serves it.
