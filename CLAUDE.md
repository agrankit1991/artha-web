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
  `PriceChart` therefore fetches bars _and_ moving averages from
  `/api/figures`, which reads the same per-session rows a rule reads,
  rather than computing averages in the browser.

  **Advanced Charts is also not licensable here.** Checked 2026-09-20:
  TradingView grant it "only to companies for use in public web projects
  and/or applications", explicitly not for personal use. This platform is
  single-user and personal. Lightweight Charts is Apache 2.0 and carries no
  such restriction.

- **TradingView embed widgets are for data this platform does not hold.**
  World markets, a live heatmap, anything intraday. Never for prices that
  are also in `daily_bar`: an embed draws TradingView's numbers with
  TradingView's indicator maths, and a chart disagreeing with the signal
  beside it sends somebody debugging a rule that is working correctly.
  `TradingViewWidget` is the one wrapper; it follows the app's theme,
  credits TradingView as their terms ask, and clears itself up, because
  the embed replaces its own script with an iframe and leaves it behind
  otherwise.

  **Take the symbols from the previous project, not from guesswork.**
  Which markets a free widget will actually draw is documented nowhere,
  and the set in `Overview.tsx` -- `FOREXCOM:SPXUSD`, `NASDAQ:NDX`,
  `INDEX:N100`, `SPREADEX:FTSE`, `XETR:DAX`, `BLACKBULL:JPN225`,
  `SSE:000001`, `HSI:HSI`, and a BSE/SENSEX heatmap -- is the one already
  known to work. An invented symbol fails by drawing nothing, which looks
  like a broken widget rather than a wrong ticker.

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
  Re-verified: `select` works with the polyfills in `src/test-setup.ts`;
  `@radix-ui/react-dropdown-menu` still never opens, and a test of one
  times out rather than failing. `src/components/Menu.tsx` is this
  application's own menu for that reason — a trigger, a panel, Escape and
  click-outside, and every choice a real button with `role="menuitem"`.
  It carries sign-out and the theme, which are exactly the things worth
  having tests for. Do not swap it for the Radix one without a browser
  test runner. `src/components/Tooltip.tsx` exists for the same reason.
- **A stub that ignores the query hides what depends on it.** `stubPlatform`
  takes `bodyFor(path)` as well as a fixed `body`; a paged endpoint stubbed
  with a fixed first page will pass a test of "load more" that the real
  platform would fail.
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

**One `Chart`, as there is one `DataTable`.** Every chart is
`src/components/Chart.tsx` with different series: a price history, a
comparison, an indicator over time, a backtest's equity curve later.
Creating the chart, theming it, tearing it down, the legend, the empty and
loading states and the way out to TradingView are decided there once.
Callers describe _what_ to draw -- candles, lines, bars -- never how.
`PriceChart` and `ComparisonChart` are thin adapters over it: they turn
domain data into series and own the one thing that is theirs, the moving
averages and the rebasing respectively.

Every colour a chart draws with is in `src/lib/chartPalette.ts`, not in
the component that happens to draw it: a reader who has learnt that the
red line is the two-hundred-session average on one screen should not have
to learn it again on the next. Those colours are deliberately apart from
the theme's accent, because a chart's own series must stay recognisable
whichever accent is chosen. The averages run light to heavy as they
lengthen, and are drawn thin -- three of them at two pixels each is a
chart of moving averages with a price somewhere behind it.

The crosshair carries a reading: the session, and what every line was
worth on it, over the plot rather than beside it so the eye does not leave
the line it is following. Volume is left out -- it is context for the
price, not a figure anybody reads off a crosshair -- and a series with no
point on that session is simply absent, which is ordinary when one
instrument listed later than another.

A series says which pane it belongs in. Nought is the price; anything else
gets a band of its own underneath, which is what an oscillator on a nought
to a hundred scale needs -- drawn over a price it is a flat line along the
bottom. `PriceChart` carries its own controls (shape, and what is laid
over the price) rather than taking them as props, so it drops into an
instrument page with its settings intact.

**Full lists use `DataTable`'s `full` mode**, which is the shape the
previous project's indices page settled on: a scrolling container, the
header pinned as rows pass under it and the first column pinned as figures
pass beside it. Five hundred rows and a dozen columns are unreadable
without both -- by the third screen a reader has lost which row they are
on and which column they are in. `linkTo` makes the first column the
link to a row's own page; the trailing chevron it once had is gone,
because the user wanted the name itself to be the way through.

**A company in a table is two columns, `Symbol` and `Name`,** built by
`symbolColumn` and `nameColumn` in `src/components/identityColumns.tsx`.
This is the previous project's layout, which the owner chose over a stacked
symbol-over-name cell (2026-09-23): the symbol in the accent colour as the
way through, the name beside it with the streak badge (`StreakBadge`,
shown from a second session) where the table is a ranked list.

**Wherever anything with a page appears in a list, its name leads there.**
Companies, indices, sectors, funds, offerings, futures contracts and
mover rows all link through `DataTable`'s `linkTo`, which makes the first
column the link; there are no trailing chevrons. The paths are spelled
once in `src/lib/paths.ts` (`companyPath`, `populationPath`, `fundPath`,
`ipoPath`, `futurePath`, `moversPath`, `comparePath`, `watchlistPath`,
`hitPath` for a search result).

**The heatmap is ours, not an embed.** Drawn from stored figures, so it
agrees with the table beside it and works for any population -- including
the hundred and fifty-eight sectors no outside widget has heard of. Every
tile is the same size on purpose: a real heatmap sizes by market
capitalisation, which this platform derives rather than stores, and equal
tiles are an honest "every company counts once" that matches the breadth
counts rather than contradicting them.

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
- **Routing** (`src/App.tsx`): `PATHS` is the one place a path is spelled.
  Markets: `/` overview, `/breadth`, `/indices`, `/sectors`, `/futures`,
  `/movers/:list`, `/earnings`, `/news`. Research: `/screen`, `/compare`,
  `/ipos`, `/funds`. Mine: `/watchlists`, `/profile`. Entity pages:
  `/company/:ref`, `/index/:ref`, `/sector/:ref`, `/fund/:code`,
  `/ipo/:id`, `/future/:key`.

  **Company, index and sector addresses are readable** (owner's choice,
  2026-09-23): `/company/RELIANCE`, `/index/nifty-50`,
  `/sector/it-software`, built only by `companyPath`/`populationPath` in
  `src/lib/paths.ts`. `ReferencedPage` asks `/api/references/{kind}/{ref}`
  what the address names and draws the page for the resolved key. A
  BSE-only company goes by its ISIN, because seven BSE symbols belong to a
  different NSE company. The platform matches an index or sector slug on
  letters and digits only, so `slug()` may change punctuation freely.
  Addresses holding an instrument key still resolve, so old bookmarks work. Pages that are a _question_ keep their
  state in the URL (`useSearchParams`): the screener's conditions, the
  comparison's set, the movers list and scope, a watchlist's `?list=`,
  and `?as_of=` on the company and population pages. These are places a
  reader bookmarks and presses Back out of. Caddy serves the SPA
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
- **A population** (`src/routes/Population.tsx`) at `/index/:key` and
  `/sector/:key` -- one page for both, because an index and a sector are
  the same question asked of a different set of companies. What it is,
  how it is doing against the market and the size bands, its own price,
  its breadth, a heatmap of its companies and the full list of them. A
  sector has no instrument of its own, so it gets no price chart and its
  performance stands on the median of its members.

  **Relative strength is a chart, not a table.** It opens on the
  comparison -- the population against the market and the three size
  bands, rebased to the first session they share -- with its own price one
  tab away. The gaps are read off the legend's totals over whichever range
  is chosen.

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
- **The frame** (`src/components/AppShell.tsx`): navigation down the side,
  the account and theme across the top, the running build at the bottom.
  The sidebar is the navigation because this is a set of places rather than
  a flow; it slides away on a phone, where the header carries the button
  that brings it back.
- **Profile** (`src/routes/Profile.tsx`) -- what the platform holds about
  the sign-in, both theme choices, and signing out. Deliberately short: a
  profile with an invented "activity" panel is worse than one that admits
  there is nothing to show.
- **Shared components** in `src/components`: `DataTable`, `Delta`,
  `MoverPanel`, `IndexCard`, `MiniCandlestick`, `ScopeSelector`,
  `ScopePicker`, `ThemeToggle`, `Meter`, `Sparkline`, `Statistic`,
  `BreadthPanel`, `BreadthGridPanel`, `RegimeBanner`, `NewsFeed`,
  `LoadMore`, `RangeSelector`, `Tabs`, `Heatmap`, `Chart`, `ChartControls`,
  `ComparisonChart`, `PriceChart`,
  `TradingViewWidget`, `TradingViewLink`, `Menu`, `Tooltip`, `ThemeMenu`,
  `UserMenu`, `AppShell`. Since the plan
  (`../UI-PLAN.md`): page furniture `PageHeader`, `SectionHeader`,
  `StatTile`/`StatGrid`, `FactList`, `RangeMeter`, `Empty`, `Failed`,
  `Hint`, `Chooser`, `Tabs`; `SearchBox` in the header; `Dialog` (own,
  like `Menu`, so jsdom can drive it); `WatchButton`, `ShareButton`,
  `SessionPicker`, `EarningsPanel`, `ValuationPanel`,
  `ValuationHistoryChart`, `PopulationValuationPanel`,
  `InstrumentFigures` (with a sparkline beside every reading when given
  history). Entity icons and information marks are the one vocabulary
  in `src/lib/entities.ts`.
- **Links out to TradingView** come from `/api/external-symbols`, which
  serves what the weekly job recorded that each outside service calls our
  instruments. A page asks about everything it draws in one request. An
  instrument the service does not know gets no link at all rather than a
  guessed one: a link to the wrong instrument's chart is worse than none,
  because nothing about it looks wrong. A symbol flagged `derived` was
  worked out from the ticker and says so.
- **Card grids are three across, never four.** Every count asked for is a
  multiple of three -- six headlines on the overview, twelve to a news
  batch -- so the last row is always full. The news page asks for
  thirteen first, because the lead article is shown above the grid rather
  than in it.
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
- **Theme** in `src/lib/theme.tsx`, on two axes. Light, dark or following
  the system decides the lightness; the accent (neutral, blue, green,
  orange -- the four the previous project had) decides the hue. Stored
  apart, because changing one must never reset the other, and both work
  when storage is blocked; they are just forgotten between visits.

  **An accent is a whole palette, not a highlight colour.** The four
  palettes in `src/index.css` are carried over from the previous
  incarnation of this project rather than invented again, and the
  relationship between their three surfaces is the point: the page is a
  tinted off-white, a card is pure white on top of it, and the chrome --
  sidebar, header, footer, through the `--layout` tokens -- is a third
  shade deeper than both. Two earlier attempts failed here. The first
  moved `--primary` and `--ring` alone, which is a few icons and the
  sidebar highlight, so applying an accent changed nothing visible. The
  second derived every token from a hue and a tint, which tinted the page
  but left it and the cards the same near-white, so the interface had no
  depth. `--gain` and `--loss` are never part of an accent: green has to
  mean "up" on every theme.

  `src/lib/accents.test.ts` pins all of that against the stylesheet --
  that every accent restates every surface in both light and dark, that
  the page, the card and the chrome are three different values, and that
  the menu's swatch is the palette's own `--primary` rather than something
  close to it. Nothing else in the build notices when the accent list and
  the CSS disagree, which is exactly how the first attempt shipped looking
  like it worked.

- **Card grids are three across, never four.** Every count asked for is a
  multiple of three -- six headlines on the overview, twelve to a news
  batch -- so the last row is always full. The news page asks for
  thirteen first, because the lead article is shown above the grid rather
  than in it.
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
- **Theme** in `src/lib/theme.tsx`, on two axes. Light, dark or following
  the system decides the lightness; the accent (neutral, blue, green,
  orange -- the four the previous project had) decides the hue. Stored
  apart, because changing one must never reset the other, and both work
  when storage is blocked; they are just forgotten between visits.

  **An accent is a hue, not a highlight colour.** `src/index.css` derives
  every surface, border and muted tone from `--hue` and `--tint`, so
  choosing one tints the whole page. The first attempt moved `--primary`
  and `--ring` alone, which in this interface is a few icons and the
  sidebar highlight: applying it changed almost nothing visible and read
  as a switch that did not work. `--gain` and `--loss` are never derived
  from the hue -- green has to mean "up" on every theme.
  `src/lib/accents.test.ts` pins both invariants against the stylesheet,
  because nothing else in the build notices when the accent list and the
  CSS disagree.

## Test conventions learnt the hard way

- `stubPlatform` matches by longest path prefix and its `bodyFor` /
  `statusFor` also receive the method, so a refused `POST` beside a
  successful `GET` of the same address is a case a test can state. A
  prefix that is also the prefix of another endpoint (`/api/populations`
  and `…/valuation`) is answered with `bodyFor` on the suffix.
- `renderPage(ui, { at })` renders under a `MemoryRouter` at an address,
  for pages that read their state from it.
- `URLSearchParams` writes a space as `+`; decode _and_ replace before
  asserting on a requested path.
- Every canvas has a quiet `null` context in `src/test-setup.ts`; a test
  that needs one spies over `HTMLCanvasElement.prototype.getContext`.
- Preferences persist on purpose and are cleared before every test in
  the setup; a test that wants one sets `localStorage` and calls
  `forgetForTests()` before rendering.
- A form's buttons live inside the form, so Enter submits a two-field
  form; `Dialog`'s `actions` slot is for dialogs without a form.
- A component that reads a route parameter reads it itself
  (`useParams`) rather than taking it as a prop, or a test that changes
  the address changes nothing.

## What remains

Every slice in `../UI-PLAN.md` has landed; the open items are gathered
there under "What remains" (contributors, median-multiple history,
movers as of a day, watch buttons on rows and other entity pages, saved
screens, continuous futures, alerts). Registration by invitation and
localisation were never part of the plan.
