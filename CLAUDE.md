# CLAUDE.md - artha-web

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
not rely on them alone - `--no-verify` exists and CI is a slow way to find
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
  Advanced Charts - the latter carries its own indicator engine, which would
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
  **No embed is used since 2026-09-30:** the last, a SENSEX heatmap, was
  replaced by the platform's own `Heatmap`, and its wrapper
  (`TradingViewWidget`, which followed the theme, credited TradingView and
  cleared its iframe away) was deleted with it; git history has it if an
  embed is wanted again.

  **Take the symbols from the previous project, not from guesswork.**
  Which markets a free widget will actually draw is documented nowhere;
  the set once on the overview -- `FOREXCOM:SPXUSD`, `NASDAQ:NDX`,
  `INDEX:N100`, `SPREADEX:FTSE`, `XETR:DAX`, `BLACKBULL:JPN225`,
  `SSE:000001`, `HSI:HSI` -- was known to work. An invented symbol fails
  by drawing nothing, which looks like a broken widget rather than a
  wrong ticker.

- TypeScript is strict, including `exactOptionalPropertyTypes` and
  `noUncheckedIndexedAccess`. ESLint runs type-aware rules.
- **Colours come from tokens; text uses plain hyphens.** `src/conventions.test.ts`
  fails on a Tailwind palette class or a hex colour outside `index.css`,
  `chartPalette.ts` and `shareCard.ts` (with a shrinking list of files still
  waiting for the brand redesign), and on any en dash, em dash or U+2212
  minus anywhere in `src` (the owner's house style; the "no value" mark
  `ABSENT` is a hyphen since 2026-09-30).
- **Icons come from `src/lib/entities.ts`**, one per meaning: a section
  about a price uses `MARKS.price`, not whichever entity's icon looks close.

## Gotchas

- **Vitest and Vite majors must match.** Vitest 2 bundles Vite 5; with Vite 6
  that produces two copies of Vite's types and `defineConfig` fails to
  typecheck under `exactOptionalPropertyTypes`. Vitest 3 pairs with Vite 6.
- **Import `defineConfig` from `vitest/config`,** not `vite`, or the `test`
  key is rejected as an unknown property.
- `npm install` warns that esbuild's postinstall was skipped. Benign -
  esbuild ships prebuilt binaries through optional dependencies.
- **TanStack Table is pinned to v8, deliberately.** v9 is the current stable
  release, but its types thread the feature set through every column
  definition, and under `exactOptionalPropertyTypes` a generic wrapper around
  it - which is exactly what `DataTable` is - cannot be made to typecheck
  without casting away the row type. A shared table that needs a cast at its
  own boundary is worse than an older major. Revisit when v9's generics
  settle; the call sites would not change.
- **Radix popovers that open on pointer events cannot be driven in jsdom.**
  Re-verified: `select` works with the polyfills in `src/test-setup.ts`;
  `@radix-ui/react-dropdown-menu` still never opens, and a test of one
  times out rather than failing. `src/components/Menu.tsx` is this
  application's own menu for that reason - a trigger, a panel, Escape and
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
the component that happens to draw it, and named for what it means
(`PRICE_LINE`, `RISE`, `PROFIT`, `BENCHMARK`, `AVERAGE_COLOURS`): a reader
who has learnt that the heavy violet line is the two-hundred-session
average on one screen should not have to learn it again on the next. Each
is a reference to a `--chart-*` token in `index.css`, so light and dark are
decided there; `Chart` resolves a reference to its colour when it draws
(`src/lib/tokenColour.ts`), and HTML beside a chart uses the reference as
it is. `ThemeProvider` changes the `dark` class in a layout effect so a
chart rebuilding on the change reads the new colours.

**Seven series colours** (teal, orange, violet, magenta, indigo, olive,
blue), in an order checked for colour blindness and normal vision in both
modes, with no green, red or amber: those are rise, fall and caution, and
nothing else is drawn in them (profit and fund holders were once in the
rising candle's green). No eighth hue passed without being mistaken for
caution amber, so Compare takes seven instruments, and `coloured()` throws
rather than cycle. The averages are one violet hue, light to heavy as they
lengthen (they were green, orange and red until 2026-09-30), and are drawn
thin -- three of them at two pixels each is a chart of moving averages
with a price somewhere behind it. A forecast is dashed in the price's own
teal.

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

**`height` is the main plot's; each lower pane adds its own band**
(`paneHeight`) under it, set through stretch factors (2026-09-30): three
panes sharing one fixed height left the middle one about thirty pixels
tall, and `setHeight` on the second of two bands took its room back from
the first. The frame's margin is at most six bars at each end and a tenth
of a short series (never under half a bar), so four yearly points fill the
width. A sum in rupees crore uses the `crore` scale, whole and grouped the
Indian way on the axis and in the reading ("1,43,55,186", not
"14355186.00").

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

**The heatmap is ours, not an embed** (`Heatmap`, rebuilt 2026-09-30 at the
owner's request to work like TradingView's). Drawn from stored figures, so
it agrees with the tables beside it and works for any index, any sector or
the whole market; it replaced the overview's TradingView SENSEX map. One
request, `GET /api/heatmap?scope_kind=&scope_key=` (`fetchHeatmap`), brings
every company's sector, market cap (from the platform's nightly
`company_snapshot`), traded value and its move over 1D/1W/1M/3M/YTD/1Y, so
choosing a period or a size redraws without asking again (the whole market
is about 0.8 s and 1.9 MB uncompressed; a `limit` parameter would trim it).
Tiles are sized by market cap by default, with Traded value and Equal
(every company counting once, the owner's 2026-09-23 choice, kept as an
option); laid out squarified, sectors first (`src/lib/treemap.ts`, tested
as arithmetic), at most the 500 largest; coloured against a reach per
period (±3% a day up to ±50% a year), eased by a square root so an
ordinary day is not a wash, mixed in OKLab from the `--heat-*` tokens with
each tile's text chosen by contrast (`src/lib/heatColour.ts`). A sector's
name zooms into it; a search dims all but the matches; hovering or focusing
a tile shows its card; Table shows the same companies as a `DataTable`;
full screen where the browser offers it. On the overview it follows the
chosen population, and all the indices (not companies) map the whole market.

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
  `/movers/:list`, `/earnings`, `/news`. Research: `/screen`, `/scans`,
  `/strategies`, `/backtests`, `/compare`, `/ipos`, `/funds`. Mine: `/watchlists`,
  `/profile`, and `/visitors` for the owner alone. Entity pages: `/company/:ref`, `/index/:ref`,
  `/sector/:ref`, `/fund/:code`, `/ipo/:id`, `/future/:key`,
  `/backtest/:id`, `/strategy/:id` (`/strategy/new` for one not yet saved),
  `/strategies/years`.

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
  and `?as_of=` on the company and population pages; since the brand
  redesign also the filters of Indices, Sectors, Deals, Earnings
  (`?cadence=`) and News (`?q=`, `?within=`, `?company=`). These are places a
  reader bookmarks and presses Back out of. Caddy serves the SPA
  fallback, so a deep link works. **One parameter is `useSearchParam(name,
fallback)`** (`src/hooks/useSearchParam.ts`): a value at its default is
  left out of the address, and a change replaces the history entry. Two
  limits, both from react-router: the setter changes with every address,
  so an effect that calls it compares before writing (News does); and two
  setters in one event do not compose, the second replacing the first.

- **The overview** (`src/routes/Overview.tsx`) -- under a centred
  "Market Overview" title, the eight headline indices as cards in the
  previous project's layout, the benchmark against gold, every mover list
  for whichever population is chosen (each titled with its own coloured
  icon, from `MOVER_LISTS`), and the news feed. One request brings all
  seven lists, so that section arrives whole. The global market overview
  widget was removed at the owner's request (21 Sep 2026); do not bring it
  back with the rest of the old layout.
- **News** (`src/routes/News.tsx`) -- the whole feed, paged, with three
  filters that compose: words, one company, a window. Read downwards and
  grown by "Load more" rather than paged -- replacing the batch a reader is
  part-way through loses their place every time. All applied by the
  platform, so a page of twelve is twelve of the matches rather than
  twelve of the latest filtered afterwards. The companies offered as
  filters are the ones actually written about, because a reader wanting
  one company's news should not have to spell its symbol.
- **Entity pages say each figure once** (company, index or sector, futures
  contract; 2026-09-30). `InstrumentHeader` is the glance: the name (a
  placeholder while it loads, never a provider key), badges, the level, its
  move and the day's and the year's range meters. `InstrumentFigures`
  ("Key figures") is everything else, three cards three across: returns
  (with YTD), trend and volume (distances from the 52-week high and low,
  the deepest fall and the 200-day, drawn plainly), momentum and risk (RSI
  as a level to one decimal). It lost its "Latest session" and "52-week
  range" cards, which repeated the header. The 52-week range is the
  platform's, **on closing prices**; an exchange's site quotes intraday
  extremes, so its figures can differ.
- **A company** (`src/routes/Company.tsx`, reworked 2026-09-30): the tab
  (`?tab=`) and the session (`?as_of=`) are in the address, and a tab's
  data is read when it is first opened and kept. The overview runs price
  and performance, key figures, valuation (the tiles and the history in
  one section), against the market (bars per benchmark in percentage
  points, on one scale, and the peers), and trading activity (delivery and
  bulk / block deals) last. The indices holding it are one header chip, "In
  N indices", opening the list. A past session gets a note saying what it
  re-dates. Each section reports its own failure.
- **A population** (`src/routes/Population.tsx`) at `/index/:ref` and
  `/sector/:ref` -- one page for both, because an index and a sector are
  the same question asked of a different set of companies. In order
  (brand redesign, 2026-09-30): the header (its level, move and ranges),
  the price and
  performance chart, the index's own figures, breadth over its own
  250-session window (it followed the chart's range, so five years of
  price meant five years of breadth), valuation, earnings, then its
  companies: the heatmap, the day's moves (who lifted and dragged it, in
  index points or percentage points for a sector, and the spread of moves),
  index changes and the constituents. Each company's part in the move is
  named once there and in the table's column; the valuation panel's
  rupees-moved lists were a third telling in the same order and are gone.
  A sector has no instrument of its own, so it gets no price chart and its
  performance stands on the median of its members.

  **`?as_of=` re-dates only part of the page, and a note says which:**
  the level, the figures and the companies. The chart, breadth, valuation
  and earnings stay latest, and contribution is hidden for a past session
  (it would weigh a past move by today's capitalisations).

  **The chart opens on its own price** (the owner's order, 2026-09-23),
  with relative strength one tab away: the population against the market
  and the three size bands, rebased to the first session they share. The
  gaps are read off the legend's totals over whichever range is chosen.

- **Market breadth** (`src/routes/Breadth.tsx`) -- the same counts at
  length: any population over any of five windows; the regime the
  population is in, named; six headline measures each printed with the
  sentence that says what the reading means; a grid of every sector or
  every index, strongest first, with each one's turn over the past week;
  and every counted session in the one table, sortable by any column.
  Each share carries where it stands in that population's _own_ history,
  because 43% above the 200-day is weak or ordinary depending entirely on
  the population.

  **Participation over time** (`BreadthHeatmap`, 2026-09-28, owner's
  request for five and twenty years "with same daily details") keeps the
  original grid exactly -- a row per population, a 12px column per
  session, newest at the right -- and only gains, in the same card, a span
  selector (50D to Max, apart from the page's window so twenty years
  never loads into the table) and chips to add, remove and reorder
  populations (`ParticipationPopulations`). **Two designs were rejected
  first:** a vertical canvas grid fitted to the view, and a separate
  detail page; the owner wanted the old view extended in place, with
  sideways scrolling. A longer span is the same cells, scrolled: only the
  columns in view are built (`src/lib/visibleRange.ts`), the scrolled-past
  sessions standing in as one gap cell of their width at each end, and
  the grid opens scrolled to the newest session. Date labels are laid
  over the header cells, not in them, so no label widens its column and
  every session keeps the 14px pitch the gaps are sized by. The set of
  populations is kept in preferences (`participation`, null meaning "the
  headline indices the platform counts") and Reset returns to it.
  Companies are deliberately not offered: one company has no share of
  members above an average. One request serves every row:
  `GET /api/breadth/participation?scope=index:<key>&scope=sector:<key>&sessions=`,
  about 0.8 MB for twenty years of seven indices against about 17 MB as
  seven full breadth readings.

- **The breadth glance** (`src/components/BreadthPanel.tsx`) - how many
  took part rather than how far the index moved, used by both screens. One proportional bar for the split, three meters for the moving
  averages, two sparklines, and a plain-language reading of the McClellan
  oscillator: "+42" says nothing to most readers and "more stocks joining"
  does. Colour never carries a meaning on its own; every figure is printed
  and every shape is labelled for a screen reader.
- **Backtests** (`src/routes/Backtests.tsx`, `src/routes/Backtest.tsx`,
  2026-09-26) -- every playbook kept by the platform (`backtest --keep` on
  the laptop, `import-backtest` in production), and one whole: the
  out-of-sample verdict first, growth against the index on the one
  `Chart`, the periods, each year, the rules in words
  (`src/lib/backtestReadings.ts`) and every trade. The edge over random
  picks is emphasised wherever it appears, because survivor-only history
  flatters every return. A trade in a company no longer listed has no page:
  `DataTable`'s `linkTo` returns null for such a row, and its name stays
  plain text.
- **Strategies** (`src/routes/Strategies.tsx`, `src/routes/Strategy.tsx`,
  2026-09-26, owner's request: "a place where I can create strategies and
  backtest them and see the instruments matching them") -- strategies are
  written as TOML text in `StrategyEditor`, checked by the platform as
  they are typed (`POST /api/strategies/check`, debounced), saved, and run
  by the platform's backtester service. A combination names saved
  strategies by name and plays each in the market conditions it gives.
  The page polls every five seconds while a run is queued or running, then
  shows the verdict and the companies the latest backtest would hold today
  (`StrategyResultPanel`, which reads the picks from the kept backtest the
  Backtests page shows). **Text, not a form, deliberately (v1):** the
  platform's one reader of the language decides what is valid, so the page
  cannot drift from the backtester; the templates in
  `src/lib/strategyTemplates.ts` carry every lever, commented. The
  reader's edits are kept apart from the loaded text (`edited`), so a poll
  reloading the strategy never overwrites unsaved rules.
  While a strategy would buy nothing (its gate shut, say),
  `BacktestPicksPanel` still lists what passes its rules, the first
  slots' worth marked Next: the owner researches on weekend closes, and a
  shut market is when the watchlist is wanted (2026-09-27).
  **In plain words** (`StrategyExplanationPanel`, 2026-09-27, the owner
  found the rules hard to follow and asked for them "in simple language so
  a non engineer can understand"): the platform says what a strategy does
  topic by topic, from the same parsed rules the backtest plays, and the
  page only lays it out. `StrategyEditor` draws it beside the text on a
  wide screen, from the same check that validates the text. The column
  stays with a hint while the text does not read, so the text box never
  changes width mid-typing. A backtest's Rules section shows it above the
  rules as written.
  A backtest's page also shows its **risk and streaks** (`BacktestMeasures`,
  one row per measure, one column per period), the **basket sizes**
  (`BacktestBaskets`), each year's worst fall, holdings, trades and breadth,
  and each trade's shares and weights. **What worked each year**
  (`src/routes/StrategyYears.tsx`, `/strategies/years`, linked from
  Strategies as _By year_) ranks every saved strategy by calendar year beside
  the market and names what the leaders had in common. It is hindsight, and
  the page says so.
- **The brand** (`public/brand/`, 2026-09-29): the owner's own logo, an
  orange letter that reads as both अ and A, a teal cursive S and a tail
  rising into an arrow. The old site had it only as a small raster (its
  `brand.svg` wraps a 392x276 PNG), so it was **traced** into vectors
  (`logo.svg`), strokes thickened a little so the hairlines survive small
  sizes. **The whole logo is used everywhere** -- sidebar, favicon, sign-in:
  an icon of the अ/A alone was tried and the owner rejected it ("it only has
  1st char"). `logo-32.png` and `apple-touch-icon.png` (the logo on white,
  square: iOS rounds it) are rendered from `logo.svg`. The trace script, the
  source and the rejected explorations (redesigns drawn with a broad-nib
  pen, gold and kesar palettes) are in `../research/logo/`. Regenerate
  rather than hand-edit.
- **The frame** (`src/components/AppShell.tsx`): navigation down the side,
  search, the theme and the account across the top, and what the data
  reaches ("Data to 25 Sept 2026", from `/api/sessions?limit=1`) and the
  running build at the bottom. The brand row (logo and the coloured name)
  leads home. A detail page lights the place it belongs to through the
  screen's `matches` prefixes (`/backtest/` under Backtests, `/movers/`
  under Movers). On a phone the sidebar slides away and is `invisible`
  while shut, so its links leave the tab order; Escape closes it and gives
  the focus back to its button, and the header carries the logo. An
  address nothing lives at gets `NotFound` rather than an empty frame, and
  the wait for the session shows the logo. `g` then a letter jumps to every
  page but the owner's Visitors (`KeyboardShortcuts`).
- **Sign-in** (`src/routes/SignIn.tsx`) is the one page that is all brand:
  the logo, the name in its two colours and in Devanagari (अर्थ विज्ञान, in
  Tiro Devanagari Sanskrit, loaded by this page alone), one line on what the
  site is, the form in a card over a soft wash of teal and orange, and the
  theme on offer. The platform's reasons are shown as sentences.
- **Profile** (`src/routes/Profile.tsx`) -- what the platform holds about
  the sign-in, light or dark, and signing out. Deliberately short: a
  profile with an invented "activity" panel is worse than one that admits
  there is nothing to show.
- **Visitors** (`src/routes/Visitors.tsx`, `/visitors`, 2026-09-29, the
  owner asked to see "how many users are accessing my website and how
  many times, and maybe which page", with names and emails) -- every
  account with its days active, visits and page views over 7 days, 30 or
  all time; the pages opened most, narrowed to one person by choosing
  their row; and a chart of the days. **The owner's alone:** the route and
  its menu entry exist only when `account.is_owner`, and the platform
  answers anyone else 404. **Every page is recorded** by
  `useRecordPageViews` in `Shell`, above the choice between the sign-in
  page and the application, so strangers at the sign-in page count too
  (the owner's choice); a browser is told apart by a random identifier it
  keeps (`src/lib/visitor.ts`), and no address or device is sent. A
  failed recording is ignored. History starts on the deploy of
  2026-09-29; last seen reaches back further, from sessions.
- **Shared components** in `src/components`: `DataTable`, `Delta`,
  `MoverPanel`, `IndexCard`, `MiniCandlestick`, `ScopeSelector`,
  `ScopePicker`, `ThemeToggle`, `Meter`, `Sparkline`,
  `BreadthPanel`, `BreadthGridPanel`, `BreadthHeatmap`, `RegimeBanner`, `NewsFeed`,
  `Chip` (a removable member of a set the reader builds: the compare set
  and the heatmap's populations),
  `LoadMore`, `RangeSelector`, `Tabs`, `Heatmap`, `Chart`, `ChartControls`,
  `ComparisonChart`, `PriceChart`,
  `TradingViewLink`, `Menu`, `Tooltip`, `ThemeMenu`,
  `UserMenu`, `AppShell`. Since the plan
  (`../UI-PLAN.md`): page furniture `PageHeader`, `SectionHeader`,
  `StatTile`/`StatGrid` (the one tile: a figure, its change or its tone, and a line qualifying it; `Statistic` merged into it 2026-09-30), `FactList`, `RangeMeter`, `Empty`, `Failed`,
  `Hint`, `Chooser` (the one segmented control, with a sliding highlight), `Tabs`, `Callout` (a note set apart: info in teal, caution in amber, danger in red, progress with a spinner; `Failed` is its danger tone); `DivergingBars` (a ranked list either side of nought); `AdvanceDeclineBar` (the one risers-unchanged-fallers bar, over a neutral track: the sectors list once filled the rest with red); `PopulationCard` (an index or a sector as a card; the overview's `IndexCard` is one session of a headline index and stays apart); `CardsLoading` (shimmering placeholder cards for any card grid); `GrowthCell` and `GrowingShare` (a growth figure with its sample, and the share growing as a plain level); `RotationChart` (month against week in four quarters, plain HTML because Lightweight Charts has no scatter; on Sectors, only sectors with ten or more companies measured, since a median of two swings by tens of per cent); `SearchBox` in the header, built on `InstrumentPicker` (the one search-and-choose box, keyboard first, also adding to a comparison and to a watchlist; it was three, and only the header's took the keyboard); `Dialog` (own,
  like `Menu`, so jsdom can drive it) and `ConfirmDialog` on it; `WatchButton`, `ShareButton`,
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
- **Theme** in `src/lib/theme.tsx`: light, dark or following the system.
  The colours are the brand's -- one palette, **Samudra**, in
  `src/index.css`, chosen by the owner on 2026-09-30 from the logo's orange
  and teal (the reasoning and the rejected Kesari and Masi palettes are in
  `docs/BRAND-PLAN.md`). The logo's teal leads (buttons, links, titles, the
  page you are on); its orange is kept for brand moments (`--brand`, the
  wordmark), so nothing a reader acts on is ever the colour of a warning.
  **The four switchable accents are gone** (neutral, blue, green, orange,
  carried over from the previous project): a brand has one palette, and
  one of them was a green that said "rise". A stored `artha-accent` is
  ignored.

  The relationship between the three surfaces is the point: the page is a
  tinted off-white, a card is pure white on top of it, and the chrome --
  sidebar, header, footer, through the `--chrome*` tokens (called
  `--layout*` before 2026-09-30, which named where they were rather than
  what they are) -- is a third shade deeper than both. `--gain`, `--loss`
  and `--caution` mean rise, fall and "worth a look" and nothing else; an
  error is `--destructive`, never `--loss`. The sidebar name is drawn in
  `--wordmark-artha` and `--wordmark-science`, the logo's two colours
  deepened to read as small text.

  **No light flash for a dark reader:** a few lines in `index.html` apply
  a stored or system dark choice before the first paint, repeating the
  storage key (`artha-theme`) and rule from `theme.tsx` -- change one, change
  both. `ThemeProvider` also writes the chrome's colour, read back from the
  stylesheet, into `<meta name="theme-color">`, so a phone's address bar
  follows a choice made on the page. `public/manifest.webmanifest` names
  the site and gives the logo at 192 and 512 px for a home screen.

  `src/lib/palette.test.ts` pins it against the stylesheet: every token
  stated in both modes, three distinct surfaces, every text pair at 4.5:1
  or better, and no brand colour equal to a market colour. Nothing else in
  the build notices when a token goes missing from one mode: it falls back
  silently to the other mode's value.

## Motion (brand redesign, 2026-09-30)

Short and purposeful, never something a reader waits on, and none at all
for a reader whose system asks for less (one `prefers-reduced-motion` rule
in `index.css` stops animations, transitions and view transitions).

- **Moving between pages** uses the browser's view transitions: sidebar
  links, `DataTable`'s row links and search results pass `viewTransition`,
  and only `main` (named `page`) fades and rises, so the frame stays put.
  A link elsewhere may opt in the same way.
- **Surfaces arrive:** `Menu` and `Dialog` panels use `animate-surface-in`
  (160ms), a dialog's backdrop and a drawn chart `animate-fade-in`.
- **Loading shimmers:** `Skeleton` passes a sheen over the muted surface
  instead of pulsing; tests find it by `[data-slot=skeleton]`.
- **Highlights slide:** `Tabs` moves one highlight to the chosen tab,
  measured by `useSlidingIndicator` and moved by a CSS transition -- no
  animation library. The chosen tab marks itself until it is measured.
- The curve is `ease-brand`; the animations are `@theme` tokens, so they
  are Tailwind utilities (`motion-safe:animate-surface-in`).

## Design conventions (redesign, 2026-09-23)

The owner prefers the previous project's interface
(`../old-service/web-ui`) for its attention to detail. These are settled;
the working plan with the reasoning is `docs/REDESIGN-PLAN.md`
(git-ignored, local only).

- **Type:** Geist Sans and Geist Mono, self-hosted through
  `@fontsource-variable` in `main.tsx`. Figures use `.tabular`.
- **A change is a `Delta`:** lucide `ArrowUpRight`/`ArrowDownRight` by
  default, a signed two-decimal percent, `text-gain`/`text-loss`
  (green-700/red-600, 500 in dark; green-600 was 3.3:1 on white), ASCII hyphen for a fall because a
  U+2212 minus breaks pasting into a spreadsheet. `badge` draws the tinted
  pill the index cards use; `arrow={false}` only where colour already says
  it (a tile, a pill beside a big arrow).
- **`--caution`** (amber) for streaks, "near 52-week" and stale data. Never
  write amber classes by hand.
- **Badge or column:** a label that classifies a row (category, type,
  exchange in search, tag, streak) is a badge; anything a reader sorts or
  compares by is a column. Index tables show the index's _name_, the
  exchange as plain text and the category as an outline badge (`N/A` when
  unknown).
- **Page furniture:** `PageHeader` has the gradient title (`text-page`,
  28px), a short orange brand rule under it and an optional `count` badge
  ("217 indices"); `SectionHeader` is `text-section` (20px) with an `h-5`
  icon; a panel's `CardTitle` is a real `h3` (`as="h2"` where a page has no
  sections) at `text-panel`. The four sizes are tokens in `index.css`;
  list pages offer `ViewModeToggle` (List · Grouped · Cards),
  remembered per page through `useViewMode(page)` in preferences.
- **A signed amount is a `Delta` too:** pass `format` (e.g. `formatSignedPrice`)
  for points or crore that read up or down the way a percentage does -- the
  instrument header's point move, FII/DII nets, index contributions. Never
  colour a figure by hand.
- **Bar strips without axes are inline SVG** (`FlowBars` for nets either
  side of nought, the delivery bars in the accent): `Chart`'s bar series is
  a volume overlay squeezed under the price and cannot draw them.
- **Earnings charts draw only what most of the population reported**
  (`src/lib/earningsCoverage.ts`, 2026-09-30): the platform groups
  statements by the exact period end, so a company whose year ends in
  January is a one-company "year" beside Marches of three thousand, and
  the totals line was a sawtooth. A period is drawn when at least half as
  many companies reported as in the best-covered one, and a growth point
  when its sample is at least half the largest of that figure's; the table
  lists every period end on request. Quarterly growth is drawn quarter on
  quarter, since the year-ago quarter is held for a handful of companies.
  The cleaner fix, grouping by financial year, belongs in the platform.
- **Index contribution is approximate:** `lib/contribution.ts` weighs by
  market capitalisation, which the platform holds, not the free float an
  exchange uses, and every screen showing it says so.
- **Keyboard:** `/` or Ctrl+K searches, `?` lists shortcuts, `g` then a letter
  jumps (`KeyboardShortcuts`, `JUMPS`); none fire while typing in a field.
- **Search rows:** name, then an outline Mono badge per exchange a company
  or index trades on (our BSE listings carry alphabetic symbols, so there
  is no numeric scrip code to show), an index's category, the kind unless
  it is a company, and the close with its `Delta` on the right.

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

The redesign in `docs/REDESIGN-PLAN.md` is largely built; its Context block
lists every commit. Remaining: market-cap buckets and a momentum score,
named scans and fundamentals in the screener -- all waiting on a valuation
cache in the platform -- index membership changes, and participant-wise
open interest. Registration by invitation is built (`/?invite=`). Earlier
open items from `../UI-PLAN.md` (median-multiple history, movers as of a
day, saved screens, continuous futures, alerts) are folded into that plan.
