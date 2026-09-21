/**
 * Typed client for the artha-platform API.
 *
 * Hand-written while the surface is small. Once it is broad enough to be
 * worth it, generate this from the OpenAPI schema the backend publishes --
 * that turns the contract into a build artifact rather than something two
 * repositories agree on by hand.
 *
 * Figures arrive as strings, not numbers. The platform computes in decimal
 * because binary floating point cannot represent most prices exactly, and
 * parsing them into JavaScript numbers at the boundary would throw that
 * away before anything had used it. They are parsed where they are
 * formatted or sorted, and nowhere else.
 */

/** Response from the platform's placeholder greeting endpoint. */
export interface Hello {
  message: string;
  service: string;
  version: string;
}

/** Someone who may sign in. */
export interface Account {
  account_id: number;
  email: string;
  display_name: string;
  is_owner: boolean;
}

/** The seven lists a market can be ranked into. */
export type MoverListName =
  | "top-gainers"
  | "top-losers"
  | "most-active"
  | "most-volatile"
  | "unusual-volume"
  | "near-52wk-high"
  | "near-52wk-low";

/** Which population a list is ranked within. */
export type ScopeKind = "companies" | "indices" | "sector" | "index";

/** One instrument's place in one list. */
export interface MoverRow {
  instrument_key: string;
  symbol: string;
  name: string;
  rank: number;
  value: string;
  streak: number;
  close: string | null;
  change_percent: string | null;
}

/** One list, ranked within one population. */
export interface MoverPanel {
  name: MoverListName;
  as_of: string | null;
  rows: MoverRow[];
}

/** Every list for one population. */
export interface MoversResponse {
  scope_kind: ScopeKind;
  scope_key: string | null;
  panels: MoverPanel[];
}

/** A population that can be ranked. */
export interface ScopeOption {
  key: string;
  label: string;
}

/** What the scope selector can offer. */
export interface ScopeOptions {
  sectors: ScopeOption[];
  indices: ScopeOption[];
}

/** One session's breadth counts, and the shares taken from them. */
export interface BreadthSession {
  as_of: string;
  instruments: number;
  advancing: number;
  declining: number;
  unchanged: number;
  advancing_volume: number;
  declining_volume: number;
  new_highs: number;
  new_lows: number;
  above_sma_20: string | null;
  above_sma_50: string | null;
  above_sma_200: string | null;
  advance_decline_ratio: string | null;
  net_advance_percent: string | null;
  arms_index: string | null;
  advance_decline_line: string;
  mcclellan_oscillator: string | null;
}

/** What the share above the long average implies. */
export type BreadthRegime = "deep-risk-off" | "risk-off" | "mixed" | "risk-on" | "over-extended";

/** Where a session's shares stand in its population's own history. */
export interface BreadthPercentiles {
  sessions: number;
  above_sma_20: string | null;
  above_sma_50: string | null;
  above_sma_200: string | null;
}

/** One population's latest session, for a grid of many. */
export interface ScopeBreadth {
  scope_key: string;
  instruments: number;
  advancing: number;
  declining: number;
  above_sma_200: string | null;
  above_sma_50: string | null;
  regime: BreadthRegime | null;
  rotation: string | null;
}

/** Every population of one kind, on one session. */
export interface BreadthGrid {
  scope_kind: ScopeKind;
  as_of: string | null;
  compared_with: string | null;
  scopes: ScopeBreadth[];
}

/** One population's breadth: its latest session, its run, and its measures. */
export interface BreadthResponse {
  scope_kind: ScopeKind;
  scope_key: string | null;
  latest: BreadthSession | null;
  sessions: BreadthSession[];
  advance_decline_line: string | null;
  mcclellan_oscillator: string | null;
  mcclellan_summation: string | null;
  breadth_thrust: string | null;
  high_low_index: string | null;
  regime: BreadthRegime | null;
  percentiles: BreadthPercentiles | null;
}

/** The latest session, for one instrument. */
export interface DaySnapshot {
  open: string;
  high: string;
  low: string;
  close: string;
  previous_close: string | null;
  volume: number;
  change: string | null;
  change_percent: string | null;
  range_percent: string | null;
  gap_percent: string | null;
}

/** Price return over each trailing window, as a percentage. */
export interface TrailingReturns {
  one_week: string | null;
  one_month: string | null;
  three_months: string | null;
  six_months: string | null;
  one_year: string | null;
  year_to_date: string | null;
}

/** Where the price sits within its last year. */
export interface YearRange {
  high: string | null;
  high_day: string | null;
  low: string | null;
  low_day: string | null;
  from_high_percent: string | null;
  from_low_percent: string | null;
  max_drawdown_percent: string | null;
}

/** Moving averages and the streaks around them. */
export interface TrendSnapshot {
  sma_20: string | null;
  sma_50: string | null;
  sma_200: string | null;
  from_sma_50_percent: string | null;
  from_sma_200_percent: string | null;
  sessions_above_sma_200: number | null;
  consecutive_rises: number | null;
  consecutive_falls: number | null;
}

/** How traded the instrument is. */
export interface VolumeProfile {
  average_week: string | null;
  average_month: string | null;
  average_quarter: string | null;
  relative_to_average: string | null;
}

/** How much the price moves. */
export interface RiskSnapshot {
  average_true_range: string | null;
  deviation_20: string | null;
  volatility_month: string | null;
  volatility_year: string | null;
}

/** Oscillators, on their conventional settings. */
export interface MomentumSnapshot {
  rsi: string | null;
  macd: string | null;
  macd_signal: string | null;
  macd_histogram: string | null;
}

/** Every derived figure for one instrument, as of one session. */
export interface InstrumentOverview {
  instrument_key: string;
  as_of: string;
  sessions: number;
  day: DaySnapshot;
  returns: TrailingReturns;
  year_range: YearRange;
  trend: TrendSnapshot;
  volume: VolumeProfile;
  risk: RiskSnapshot;
  momentum: MomentumSnapshot;
}

/** One instrument an article was published for. */
export interface NewsMention {
  instrument_key: string;
  symbol: string;
}

/** Which articles a reader is asking for. */
export interface NewsQuery {
  /** Words to look for in the headline or the summary. */
  text?: string | null;
  /** Show only what was published for one instrument. */
  instrumentKey?: string | null;
  /** Show only what was published within this many days. */
  days?: number | null;
  limit?: number;
  offset?: number;
}

/** One page of the feed, and how much of it there is. */
export interface NewsPage {
  total: number;
  limit: number;
  offset: number;
  items: NewsItem[];
}

/** A company worth offering as a filter, and how much was written about it. */
export interface MentionedInstrument {
  instrument_key: string;
  symbol: string;
  name: string;
  articles: number;
}

/** One news article, with the instruments it concerns. */
export interface NewsItem {
  url: string;
  headline: string;
  summary: string;
  thumbnail_url: string | null;
  published_at: string;
  mentions: NewsMention[];
}

/** One session's close. */
export interface PricePoint {
  day: string;
  close: string;
}

/** One company in a population, as a list of them shows it. */
export interface Member {
  instrument_key: string;
  symbol: string;
  name: string;
  close: string | null;
  change_percent: string | null;
  volume: number | null;
  one_week: string | null;
  one_month: string | null;
  three_months: string | null;
  one_year: string | null;
  from_high_percent: string | null;
  from_low_percent: string | null;
  from_sma_200_percent: string | null;
  as_of: string | null;
}

/** How something did against one population it is measured by. */
export interface Comparison {
  /** The index standing for it, or null for a sector, which does not trade. */
  instrument_key: string | null;
  /** Which kind of population, so its own page can be reached. */
  scope_kind: ScopeKind;
  scope_key: string;
  label: string;
  role: string;
  returns: TrailingReturns;
  /** How far ahead the population was, in percentage points. */
  relative: TrailingReturns;
}

/** What a population returned, and how that reads against the market. */
export interface Performance {
  /** `index` is the index's own price; `members` the median of its companies. */
  basis: string;
  returns: TrailingReturns;
  against: Comparison[];
}

/** One index or sector, and what it holds. */
export interface Population {
  scope_kind: ScopeKind;
  scope_key: string;
  name: string;
  category: string | null;
  description: string | null;
  instrument_key: string | null;
  performance: Performance | null;
  members: Member[];
}

/** One instrument, as an outside service knows it. */
export interface KnownSymbol {
  instrument_key: string;
  symbol: string;
  /** True when the symbol was worked out from the ticker, not confirmed. */
  derived: boolean;
}

/** One session of an instrument, with the averages drawn over it. */
export interface ChartPoint {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  sma_20: string | null;
  sma_50: string | null;
  sma_200: string | null;
  rsi: string | null;
}

/** One instrument's sessions, oldest first. */
export interface ChartSeries {
  instrument_key: string;
  points: ChartPoint[];
}

/** One instrument's closes over a window. */
export interface PriceSeries {
  instrument_key: string;
  points: PricePoint[];
}

/** Raised when the API responds with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Whether this failure means "sign in", rather than "something broke". */
  get isUnauthorised(): boolean {
    return this.status === 401;
  }
}

/**
 * Send a request to the API and parse its JSON response.
 *
 * Paths are relative so the same code works behind Caddy in production and
 * behind Vite's dev proxy locally; there is deliberately no configurable
 * base URL to get wrong. Cookies are sent because the session is one.
 *
 * @param path - API path beginning with a slash.
 * @param init - Fetch options.
 * @returns The parsed JSON body, or undefined for an empty response.
 * @throws {ApiError} If the response status is not 2xx.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body === undefined ? {} : contentType),
      ...asRecord(init?.headers),
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await failureMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

const contentType = { "Content-Type": "application/json" };

/**
 * Narrow fetch's several header shapes to the one that can be spread.
 *
 * @param headers - Headers as a caller gave them.
 * @returns A plain record, empty when there were none.
 */
function asRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (headers === undefined) {
    return {};
  }
  return Object.fromEntries(new Headers(headers).entries());
}

/**
 * Read the platform's own explanation of a failure, if it gave one.
 *
 * The API answers with `{"detail": "..."}`, and that sentence is written for
 * a reader -- "that invitation is not valid" says more than the status code
 * ever will.
 *
 * @param response - The failed response.
 * @returns A message to show or throw.
 */
async function failureMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    // A failure with no JSON body at all -- a proxy error page, say. The
    // status is then the only thing there is to report.
  }
  return `request failed with status ${String(response.status)}`;
}

/** Query string for a scope, omitting the key when the scope takes none. */
function scopeQuery(kind: ScopeKind, key: string | null): string {
  const parameters = new URLSearchParams({ scope_kind: kind });
  if (key !== null) {
    parameters.set("scope_key", key);
  }
  return parameters.toString();
}

/**
 * Fetch the platform greeting, which identifies the service and its version.
 *
 * @returns The greeting payload.
 */
export function fetchHello(): Promise<Hello> {
  return request<Hello>("/api/hello");
}

/**
 * Fetch whoever is signed in.
 *
 * @returns The account.
 * @throws {ApiError} 401 when nobody is.
 */
export function fetchAccount(): Promise<Account> {
  return request<Account>("/api/me");
}

/**
 * Sign in and start a session.
 *
 * @param email - The address to sign in with.
 * @param password - The password.
 * @returns The account now signed in.
 */
export function signIn(email: string, password: string): Promise<Account> {
  return request<Account>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * End the current session.
 *
 * @returns Nothing, once the session has been ended.
 */
export function signOut(): Promise<undefined> {
  return request<undefined>("/api/logout", { method: "POST" });
}

/**
 * Fetch every mover list for one population.
 *
 * @param kind - Which population to rank.
 * @param key - Which sector or index, for the kinds that name one.
 * @param limit - Rows per list.
 * @returns Every list, each with its rows.
 */
export function fetchMovers(
  kind: ScopeKind,
  key: string | null,
  limit = 10,
): Promise<MoversResponse> {
  return request<MoversResponse>(`/api/movers?${scopeQuery(kind, key)}&limit=${String(limit)}`);
}

/**
 * Fetch one mover list, as deep as it is kept.
 *
 * @param name - Which list.
 * @param kind - Which population to rank.
 * @param key - Which sector or index, for the kinds that name one.
 * @param limit - Rows to return.
 * @returns The list, with its rows.
 */
export function fetchMoverList(
  name: MoverListName,
  kind: ScopeKind,
  key: string | null,
  limit = 100,
): Promise<MoverPanel> {
  return request<MoverPanel>(`/api/movers/${name}?${scopeQuery(kind, key)}&limit=${String(limit)}`);
}

/**
 * Fetch one population's breadth, with the measures taken over it.
 *
 * @param kind - Which population to count.
 * @param key - Which sector or index, for the kinds that name one.
 * @param sessions - How many sessions of history to carry.
 * @returns The run and its measures.
 */
export function fetchBreadth(
  kind: ScopeKind,
  key: string | null,
  sessions = 250,
): Promise<BreadthResponse> {
  return request<BreadthResponse>(
    `/api/breadth?${scopeQuery(kind, key)}&sessions=${String(sessions)}`,
  );
}

/**
 * Fetch the sectors and indices that have mover lists.
 *
 * @returns What the scope selector can offer.
 */
export function fetchScopes(): Promise<ScopeOptions> {
  return request<ScopeOptions>("/api/movers/scopes");
}

/**
 * Fetch the derived figures for one instrument or several.
 *
 * @param keys - The instrument keys.
 * @returns The snapshots that exist, in instrument key order.
 */
export function fetchOverviews(keys: string[]): Promise<InstrumentOverview[]> {
  const parameters = new URLSearchParams();
  for (const key of keys) {
    parameters.append("keys", key);
  }
  return request<InstrumentOverview[]>(`/api/overviews?${parameters.toString()}`);
}

/**
 * Fetch a page of the market's news.
 *
 * @param query - Which articles, and which page of them.
 * @returns The page, with the total behind it.
 */
export function fetchNews(query: NewsQuery = {}): Promise<NewsPage> {
  const parameters = new URLSearchParams({
    limit: String(query.limit ?? 12),
    offset: String(query.offset ?? 0),
  });
  // Only what was actually asked for: an empty `q` is a request for
  // everything, and sending one would make every unfiltered page look
  // like a search.
  if (query.text != null && query.text.trim() !== "") {
    parameters.set("q", query.text.trim());
  }
  if (query.instrumentKey != null) {
    parameters.set("instrument_key", query.instrumentKey);
  }
  if (query.days != null) {
    parameters.set("days", String(query.days));
  }
  return request<NewsPage>(`/api/news?${parameters.toString()}`);
}

/**
 * Fetch the companies written about most, to offer as filters.
 *
 * @param days - Only count articles published within this many days.
 * @param limit - How many companies to return.
 * @returns The companies, most written about first.
 */
export function fetchNewsMentions(
  days: number | null = null,
  limit = 12,
): Promise<MentionedInstrument[]> {
  const parameters = new URLSearchParams({ limit: String(limit) });
  if (days !== null) {
    parameters.set("days", String(days));
  }
  return request<MentionedInstrument[]>(`/api/news/mentions?${parameters.toString()}`);
}

/**
 * Fetch closing prices for one instrument or several.
 *
 * Every series ends on the same session, so two lines drawn from one
 * response cover the same window.
 *
 * @param keys - The instrument keys.
 * @param sessions - How many sessions to carry.
 * @returns One series per key, in the order asked for.
 */
export function fetchSeries(keys: string[], sessions = 180): Promise<PriceSeries[]> {
  const parameters = new URLSearchParams({ sessions: String(sessions) });
  for (const key of keys) {
    parameters.append("keys", key);
  }
  return request<PriceSeries[]>(`/api/series?${parameters.toString()}`);
}

/**
 * Fetch every population of one kind, side by side.
 *
 * One request rather than one per sector: there are a hundred and
 * fifty-eight of them.
 *
 * @param kind - Which kind of population to lay out.
 * @param rotationSessions - How many sessions back to measure the turn from.
 * @returns The populations, broadest participation first.
 */
export function fetchBreadthGrid(kind: ScopeKind, rotationSessions = 5): Promise<BreadthGrid> {
  return request<BreadthGrid>(
    `/api/breadth/grid?scope_kind=${kind}&rotation_sessions=${String(rotationSessions)}`,
  );
}

/**
 * Fetch one instrument's sessions, with the averages drawn over them.
 *
 * Bars and averages from the same rows, which are the rows a rule reads:
 * a chart that computed its own averages would draw something subtly
 * different from what a signal fired on.
 *
 * @param key - The instrument.
 * @param sessions - How many sessions to carry.
 * @returns The sessions, oldest first.
 */
export function fetchFigures(key: string, sessions = 250): Promise<ChartSeries> {
  const parameters = new URLSearchParams({ key, sessions: String(sessions) });
  return request<ChartSeries>(`/api/figures?${parameters.toString()}`);
}

/**
 * Fetch what an outside service calls these instruments.
 *
 * One request for a screen's worth of links: an instrument the service
 * does not know is absent, which is what tells a screen not to offer a
 * link that would go nowhere.
 *
 * @param keys - The instruments.
 * @param provider - The outside service.
 * @returns The symbols that exist, by instrument key.
 */
export async function fetchExternalSymbols(
  keys: string[],
  provider = "tradingview",
): Promise<Record<string, KnownSymbol>> {
  const parameters = new URLSearchParams({ provider });
  for (const key of keys) {
    parameters.append("keys", key);
  }
  const found = await request<KnownSymbol[]>(`/api/external-symbols?${parameters.toString()}`);
  return Object.fromEntries(found.map((one) => [one.instrument_key, one]));
}

/**
 * Fetch one index or sector, and the companies it holds.
 *
 * One request for the whole of a page: what it is, the instrument it
 * trades as if it has one, how it is doing against the market, and every
 * company in it.
 *
 * @param kind - Whether it is an index or a sector.
 * @param key - Which one.
 * @returns The population.
 */
export function fetchPopulation(kind: "index" | "sector", key: string): Promise<Population> {
  return request<Population>(`/api/populations/${kind}/${encodeURIComponent(key)}`);
}

/** One exchange a company trades on. */
export interface Listing {
  instrument_key: string;
  exchange: string;
  symbol: string;
}

/** An index a company currently belongs to. */
export interface Membership {
  instrument_key: string;
  name: string;
}

/** One company, and everything a page about it opens with. */
export interface Company {
  instrument_key: string;
  isin: string;
  symbol: string;
  name: string;
  description: string | null;
  sector: string | null;
  listings: Listing[];
  indices: Membership[];
  performance: Performance | null;
  peers: Member[];
}

/** Which statement a reported figure belongs to. */
export type StatementKind = "INCOME_STATEMENT" | "BALANCE_SHEET" | "CASH_FLOW" | "SHAREHOLDING";

/** Whether figures cover the group or the parent company alone. */
export type ReportingBasis = "CONSOLIDATED" | "STANDALONE" | "NOT_APPLICABLE";

/** The length of the period a figure covers. */
export type ReportingFrequency = "YEARLY" | "QUARTERLY";

/** One reported figure. */
export interface Figure {
  line_item: string;
  value: string;
  units: string;
}

/** One reporting period, and every figure reported for it. */
export interface Period {
  period_end: string;
  figures: Figure[];
}

/** One statement over the periods it was reported for. */
export interface Statement {
  statement: StatementKind;
  basis: ReportingBasis;
  frequency: ReportingFrequency;
  /** Every line item, in the order the statement reads. */
  line_items: string[];
  /** The periods, most recent first. */
  periods: Period[];
}

/** What kind of corporate event. */
export type CorporateActionKind = "DIVIDEND" | "BONUS" | "SPLIT" | "RIGHTS" | "OTHER";

/** One corporate event. */
export interface CorporateAction {
  kind: CorporateActionKind;
  label: string;
  ex_date: string;
  record_date: string | null;
  announced_on: string | null;
  amount: string | null;
  ratio: string | null;
}

/**
 * Fetch one company: what it is, how it reads, and who it competes with.
 *
 * @param instrumentKey - Either exchange's listing. Both reach the same
 *   company, so a link built from a BSE row and one built from an NSE row
 *   land on one page.
 * @returns The company.
 */
export function fetchCompany(instrumentKey: string): Promise<Company> {
  return request<Company>(`/api/companies/${encodeURIComponent(instrumentKey)}`);
}

/**
 * Fetch what a company has reported.
 *
 * @param instrumentKey - The company's listing.
 * @returns One entry per statement, basis and frequency that has figures.
 */
export function fetchFundamentals(instrumentKey: string): Promise<Statement[]> {
  return request<Statement[]>(`/api/companies/${encodeURIComponent(instrumentKey)}/fundamentals`);
}

/**
 * Fetch a company's corporate events.
 *
 * @param instrumentKey - The company's listing.
 * @returns The events, most recent ex-date first.
 */
export function fetchCorporateActions(instrumentKey: string): Promise<CorporateAction[]> {
  return request<CorporateAction[]>(
    `/api/companies/${encodeURIComponent(instrumentKey)}/corporate-actions`,
  );
}
