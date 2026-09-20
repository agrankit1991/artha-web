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

Currently **97%** on lines, branches, functions and statements, configured in
`vite.config.ts`. Actual coverage is 99.6% of statements and lines, 100% of
functions, 97.6% of branches.

`src/components/ui/**` is excluded: those are shadcn's components, copied in
rather than written here, and a test of a thin wrapper over a Radix
primitive measures the library. Everything built _on_ them is covered
normally. `src/test/**` is excluded for the same reason in reverse -- it is
fixtures, not code that ships.

**The bar only ever goes up.** Raise it to just under the current figure in
the same commit that adds the tests. Never lower it to make a build pass.
It rose from 95% with the first real views.

## Rules

- **Relative API paths only.** `fetch("/api/…")`. No base-URL environment
  variable: the dev proxy and Caddy both serve the API on the same origin, so
  introducing one only creates a way to misconfigure it.
- **All HTTP goes through `src/api/`.** Components call typed functions; they
  never call `fetch` themselves. When the API grows, generate that layer from
  the platform's OpenAPI schema so the contract is a build artifact rather
  than something two repositories agree on by hand.
- **Sparklines are inline SVG; real charts are not.** A line with no axes is
  one path and a baseline, and a charting library for that would also bring
  interaction, legends and a theme of its own to argue with. When a chart
  needs axes, crosshairs and zooming, reach for the library.
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
- **TanStack Table is pinned to v8, deliberately.** v9 is the current stable
  release, but its types thread the feature set through every column
  definition, and under `exactOptionalPropertyTypes` a generic wrapper around
  it — which is exactly what `DataTable` is — cannot be made to typecheck
  without casting away the row type. A shared table that needs a cast at its
  own boundary is worse than an older major. Revisit when v9's generics
  settle; the call sites would not change.
- **Radix popovers that open on pointer events cannot be driven in jsdom.**
  `select` works with the polyfills in `src/test-setup.ts`; `dropdown-menu`
  does not — its content never renders, by pointer or by keyboard. The theme
  control is a visible group of three buttons partly for that reason and
  partly because it is the better control. Before reaching for a menu,
  budget for testing it in a real browser.
- `index.html` must be served `no-cache` while hashed assets are immutable,
  or a deploy stays invisible until browser caches expire. That is configured
  in `Caddyfile`.

## One component per job, used everywhere

**shadcn/ui on Tailwind, with a single `DataTable`.** Every list in this app
-- movers, index constituents, the company list, a comparison -- is the same
component with different columns and data. Sorting, filtering, empty and
loading states, density, keyboard behaviour and the look of a numeric cell
are decided once, so a table learned in one place is already understood in
the next.

The same rule holds past tables. A card, a badge, a value that is up or
down, a page header, a scope selector: one implementation each, in
`src/components/`, used by every view. A second, nearly-identical component
is a bug in this codebase, not a shortcut -- it is how two screens start
disagreeing about what a falling price looks like.

shadcn components are copied into the repository rather than installed, so
they are ours to edit; edit the shared one rather than forking it at the
call site.

## What exists

- **The shell** (`src/App.tsx`) asks the platform who is signed in rather
  than guessing: the session cookie is HttpOnly, so this side cannot read it
  and should not try to infer it. It waits for that answer before choosing
  between the application and the sign-in page, because flashing the
  sign-in form at someone who is signed in is the most common way an
  application like this feels broken.
- **The overview** (`src/routes/Overview.tsx`) -- index cards, then every
  mover list for whichever population is chosen. One request brings all
  seven lists, so the page arrives whole.
- **Market breadth** (`src/components/BreadthPanel.tsx`) — how many took
  part rather than how far the index moved, for whichever population is
  chosen. One proportional bar for the split, three meters for the moving
  averages, two sparklines, and a plain-language reading of the McClellan
  oscillator: "+42" says nothing to most readers and "more stocks joining"
  does. Colour never carries a meaning on its own; every figure is printed
  and every shape is labelled for a screen reader.
- **Shared components** in `src/components`: `DataTable`, `Delta`,
  `MoverPanel`, `IndexCard`, `ScopeSelector`, `ThemeToggle`, `Meter`,
  `Sparkline`, `BreadthPanel`.
- **Theme** in `src/lib/theme.tsx`: light, dark, or following the system,
  remembered across visits and working when storage is blocked.

## Not yet built

Routing (there is one screen, so there is nothing yet to route between), the
instrument and comparison views, Lightweight Charts, registration by
invitation, and localisation.
