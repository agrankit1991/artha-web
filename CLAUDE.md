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

Currently **99%** on lines, functions and statements and **97%** on branches,
configured in `vite.config.ts`. Actual coverage is 99.9% of statements and
lines, 100% of functions, 97.8% of branches.

Branches sit lower than the rest on purpose. Under
`noUncheckedIndexedAccess` every array index read is `T | undefined`, so
code that has already established an invariant still has to write a
fallback for a case that cannot happen -- and those fallbacks are branches
no test can reach. Where the invariant can be carried in the data instead,
carry it; where it cannot, the fallback stays and is commented as
unreachable. Do not write a test that fakes reaching one.

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
- **Lightweight Charts needs a canvas, and jsdom has none.** Every test that
  renders a chart replaces the library through `src/test/chartStub.ts` --
  one stub, because two stubs of one library drift apart and then a test
  passes against a shape the library never had. Keep chart components thin
  for the same reason: the arithmetic behind a line belongs in `src/lib`
  where it can be tested as arithmetic.
- **Build dates in UTC in fixtures.** A date built at local midnight and
  serialised through `toISOString()` lands on the previous day everywhere
  east of Greenwich, which is where this application runs. Two fixtures had
  this bug; one of them also generated `2026-08-32`.
- **Node's `en-IN` renders September as "Sept", not "Sep".** A test
  asserting on a formatted date should allow both.
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
- **Routing** (`src/App.tsx`): the overview at `/`, market breadth at
  `/breadth` and the news feed at `/news`, with `PATHS` as the one place a
  path is spelled. These are
  places a reader bookmarks and presses Back out of, which is what makes
  them routes rather than component state. Caddy already serves the SPA
  fallback, so a deep link works.
- **The overview** (`src/routes/Overview.tsx`) -- the eight headline
  indices as cards, the benchmark against gold, every mover list for
  whichever population is chosen, and the news feed. One request brings all
  seven lists, so that section arrives whole.
- **News** (`src/routes/News.tsx`) -- the whole feed, paged, with three
  filters that compose: words, one company, a window. Read downwards and
  grown by "Load more" rather than paged -- replacing the batch a reader is
  part-way through loses their place every time. All applied by the
  platform, so a page of twelve is twelve of the matches rather than
  twelve of the latest filtered afterwards. The companies offered as
  filters are the ones actually written about, because a reader wanting
  one company's news should not have to spell its symbol.
- **Market breadth** (`src/routes/Breadth.tsx`) -- the same counts at
  length: any population over any of five windows; the regime the
  population is in, named; six headline measures each printed with the
  sentence that says what the reading means; a grid of every sector or
  every index, strongest first, with each one's turn over the past week;
  and every counted session in the one table, sortable by any column.
  Each share carries where it stands in that population's _own_ history,
  because 43% above the 200-day is weak or ordinary depending entirely on
  the population.
- **The breadth glance** (`src/components/BreadthPanel.tsx`) — how many
  took part rather than how far the index moved, used by both screens. One proportional bar for the split, three meters for the moving
  averages, two sparklines, and a plain-language reading of the McClellan
  oscillator: "+42" says nothing to most readers and "more stocks joining"
  does. Colour never carries a meaning on its own; every figure is printed
  and every shape is labelled for a screen reader.
- **Shared components** in `src/components`: `DataTable`, `Delta`,
  `MoverPanel`, `IndexCard`, `MiniCandlestick`, `ScopeSelector`,
  `ScopePicker`, `ThemeToggle`, `Meter`, `Sparkline`, `Statistic`,
  `BreadthPanel`, `BreadthGridPanel`, `RegimeBanner`, `NewsFeed`,
  `LoadMore`, `ComparisonChart`.
- **Breadth wording** in `src/lib/breadthReadings.ts`: every phrase that
  turns a breadth figure into something readable lives here, so two screens
  cannot describe the same reading differently. Note the `warn` tone --
  a market with nearly everything above its long average is neither good
  news nor bad, and painting it green says the opposite of what it has
  historically meant.
- **The featured indices** in `src/lib/indices.ts`: which indices the
  overview draws and the breadth page pins, in a settled order, in one
  place. India VIX is among them as a card and is filtered out as a
  population -- it has no constituents to count or rank, and the platform
  reports as much, so the filter follows the platform rather than a second
  hardcoded list.
- **Gold** is the exchange-traded fund, not an MCX contract. A contract
  expires: the longest single gold contract stored is 226 sessions, and
  stitching several needs a declared roll rule that does not exist. The
  reasoning is in `indices.ts` beside the key.
- **Debouncing** in `src/hooks/useDebounced.ts`: a search box that requests
  on every keystroke races its own answers, and the reply for "rel" can
  arrive after the reply for "relian" and leave the wrong results up.
- **Theme** in `src/lib/theme.tsx`: light, dark, or following the system,
  remembered across visits and working when storage is blocked.

## Not yet built

The instrument and comparison views, candlestick and indicator charts on
the instrument page, registration by invitation, and localisation.
