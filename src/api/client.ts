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
/**
 * Create an account with an invitation, and sign it in.
 *
 * @param details - The code, the address, a display name and a password.
 * @returns The account, signed in.
 */
export function register(details: {
  invitation: string;
  email: string;
  display_name: string;
  password: string;
}): Promise<Account> {
  return request<Account>("/api/register", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

/** A freshly minted invitation: the code is shown this once. */
export interface Invitation {
  code: string;
  expires_at: string;
}

/**
 * Mint a single-use invitation. Only the owner may.
 *
 * @param days - How long it stays open, one to thirty.
 * @returns The code and when it expires.
 */
export function createInvitation(days = 7): Promise<Invitation> {
  return request<Invitation>("/api/invitations", {
    method: "POST",
    body: JSON.stringify({ days }),
  });
}

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
export function fetchOverviews(
  keys: string[],
  asOf: string | null = null,
): Promise<InstrumentOverview[]> {
  const parameters = new URLSearchParams();
  if (asOf !== null) {
    parameters.set("as_of", asOf);
  }
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

/** Where an instrument's price may be on one future session. */
export interface BandPoint {
  /** How many sessions past the close. */
  horizon: number;
  /** The trading date that lands on; null where the calendar does not reach it. */
  session: string | null;
  /** The 10th percentile of the price then. */
  low: string;
  /** The 50th: the middle of the forecast. */
  median: string;
  /** The 90th. */
  high: string;
}

/** How the model behind one horizon's band did on years it never saw. */
export interface BandRecord {
  horizon: number;
  /** The kind of band: `volatility-cone`, or learnt trees (`lightgbm-band…`). */
  method: string;
  trained_at: string;
  /** The first session its walk-forward test covered. */
  tested_from: string;
  /** Share of tested prices that ended inside the band, 0 to 1. */
  inside_band: number;
  below_low: number;
  above_high: number;
  /** Its quantile loss in the test, in percent: lower is better. */
  pinball_loss: number;
  /** The plain volatility band's loss in the same test, for comparison. */
  baseline_pinball_loss: number;
  /** How far the middle line missed on average, in percent. */
  median_error: number;
  /** How far "no change" missed, in percent. */
  zero_error: number;
}

/** An instrument's latest price bands, and the record of the model that drew them. */
export interface PriceBands {
  instrument_key: string;
  /** The session the bands start from. */
  as_of: string;
  /** That session's close, where every band starts. */
  close: string;
  model_version: string;
  /** One per horizon, shortest first. */
  points: BandPoint[];
  records: BandRecord[];
}

/**
 * Fetch where an instrument's price may be over the next sessions.
 *
 * Not every instrument has a forecast -- one too young, or of a kind no
 * model covers -- and that is an answer, not a failure.
 *
 * @param key - The instrument.
 * @returns Its bands, or null when it has none.
 * @throws {ApiError} For any failure other than having no bands.
 */
export async function fetchPriceBands(key: string): Promise<PriceBands | null> {
  const parameters = new URLSearchParams({ instrument_key: key });
  try {
    return await request<PriceBands>(`/api/price-bands?${parameters.toString()}`);
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 404) {
      return null;
    }
    throw failure;
  }
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
export function fetchPopulation(
  kind: "index" | "sector",
  key: string,
  asOf: string | null = null,
): Promise<Population> {
  const query = asOf === null ? "" : `?as_of=${asOf}`;
  return request<Population>(`/api/populations/${kind}/${encodeURIComponent(key)}${query}`);
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
  /** Its place by market capitalisation, 1 the largest; null before the nightly snapshot has it. */
  size_rank: number | null;
  size_bucket: SizeBucket | null;
  /** Nought to a hundred; null without a year of returns. */
  momentum_score: number | null;
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

/** The kinds of page a readable address can name. */
export type ReferenceKind = "company" | "index" | "sector";

/** What a readable address names. */
export interface Reference {
  kind: ReferenceKind;
  /** What every other request asks for it by: an instrument key, or a sector's name. */
  key: string;
  name: string;
}

/**
 * Ask the platform what a readable address names.
 *
 * @param kind - The kind of page the address is for.
 * @param reference - The address's last segment: a symbol, an ISIN, a
 *   slug, or an instrument key from an address bookmarked before readable
 *   ones existed.
 * @returns What it names.
 * @throws {ApiError} 404 when it names nothing listed today.
 */
export function fetchReference(kind: ReferenceKind, reference: string): Promise<Reference> {
  return request<Reference>(`/api/references/${kind}/${encodeURIComponent(reference)}`);
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

/** Where a public offering is in its life. */
export type IpoStatus = "UPCOMING" | "OPEN" | "CLOSED" | "LISTED";

/** Which board an offering is on. */
export type IssueType = "REGULAR" | "SME";

/** One public offering. */
export interface Offering {
  ipo_id: string;
  name: string;
  status: IpoStatus;
  issue_type: IssueType;
  symbol: string | null;
  isin: string | null;
  industry: string | null;
  /** How much is being raised, in crore. */
  issue_size: string | null;
  minimum_price: string | null;
  maximum_price: string | null;
  cut_off_price: string | null;
  face_value: string | null;
  /** Shares per lot: the smallest thing anybody can buy. */
  lot_size: number | null;
  minimum_quantity: number | null;
  bidding_start: string | null;
  bidding_end: string | null;
  listing_price: string | null;
  listing_exchange: string | null;
  /** Times subscribed, as published. */
  total_subscription: string | null;
  rhp_url: string | null;
  drhp_url: string | null;
  allotment_date: string | null;
  refund_initiation: string | null;
  listing_date: string | null;
  mandate_end: string | null;
}

/** One share class of one fund. */
export interface Scheme {
  scheme_code: string;
  name: string;
  amc: string | null;
  category: string | null;
  /** Direct or regular: the same fund with and without commission. */
  plan: string | null;
  option: string | null;
  isin_growth: string | null;
  isin_reinvestment: string | null;
  nav: string | null;
  nav_date: string | null;
  /** What it has returned; the long windows are yearly rates. */
  returns: SchemeReturns;
}

/** One page of schemes, and how many there are in all. */
export interface SchemePage {
  total: number;
  limit: number;
  offset: number;
  items: Scheme[];
}

/** What the schemes may be narrowed by. */
export interface SchemeFilters {
  categories: string[];
  fund_houses: string[];
}

/** What a scheme returned over each window. The long ones are annualised. */
export interface SchemeReturns {
  one_month: string | null;
  three_months: string | null;
  one_year: string | null;
  three_years: string | null;
  five_years: string | null;
}

/** One published value. */
export interface SchemeValue {
  nav_date: string;
  nav: string;
}

/** The one-year return as it stood on a day. */
export interface RollingReturn {
  nav_date: string;
  percent: string;
}

/** One scheme, its record, and its published values. */
export interface Fund {
  scheme: Scheme;
  returns: SchemeReturns;
  values: SchemeValue[];
  /** The one-year return on every day in the window it can be measured. */
  rolling: RollingReturn[];
}

/** Which schemes a reader is asking for. */
/** What the scheme list can be ordered by, across every scheme, on the platform. */
export type FundSort =
  "name" | "nav" | "one_month" | "three_months" | "one_year" | "three_years" | "five_years";

export interface FundQuery {
  text?: string | null;
  category?: string | null;
  amc?: string | null;
  sort?: FundSort | null;
  descending?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Fetch every stored public offering.
 *
 * All of them: a year brings a few hundred, so searching and narrowing
 * happen here rather than over the wire, which makes them instant.
 *
 * @returns The offerings, most recent bidding first.
 */
export function fetchIpos(): Promise<Offering[]> {
  return request<Offering[]>("/api/ipos");
}

/**
 * Search the mutual fund schemes.
 *
 * @param query - What to look for, and which page of it.
 * @returns The page, each scheme carrying its latest value.
 */
export function fetchFunds(query: FundQuery = {}): Promise<SchemePage> {
  const parameters = new URLSearchParams({
    limit: String(query.limit ?? 25),
    offset: String(query.offset ?? 0),
  });
  // Only what was actually asked for: an empty filter is a request for
  // everything, and sending one would narrow nothing while looking as
  // though it had.
  if (query.text) {
    parameters.set("text", query.text);
  }
  if (query.category) {
    parameters.set("category", query.category);
  }
  if (query.amc) {
    parameters.set("amc", query.amc);
  }
  if (query.sort) {
    parameters.set("sort", query.sort);
    parameters.set("order", query.descending === true ? "desc" : "asc");
  }
  return request<SchemePage>(`/api/funds?${parameters.toString()}`);
}

/**
 * Fetch what the schemes may be narrowed by.
 *
 * @returns The categories and the fund houses.
 */
export function fetchFundFilters(): Promise<SchemeFilters> {
  return request<SchemeFilters>("/api/funds/filters");
}

/**
 * Fetch one scheme, its record and its published values.
 *
 * @param schemeCode - AMFI's identifier.
 * @param years - How much history to draw.
 * @returns The scheme.
 */
export function fetchFund(schemeCode: string, years = 5): Promise<Fund> {
  return request<Fund>(`/api/funds/${encodeURIComponent(schemeCode)}?years=${String(years)}`);
}

/** What kind of thing a search found, which decides where it leads. */
export type HitKind = "company" | "index" | "sector" | "fund";

/** One thing a search found. */
export interface SearchHit {
  kind: HitKind;
  /** What its page is reached by. */
  key: string;
  label: string;
  detail: string | null;
  /** Where a company or an index trades, preferred first; empty otherwise. */
  exchanges: string[];
  /** How an index's exchange classifies it, when it has said. */
  category: string | null;
  close: string | null;
  change_percent: string | null;
}

/**
 * Find companies, indices, sectors and schemes by a few letters.
 *
 * @param query - What was typed.
 * @param limit - How many to return.
 * @returns The best matches first, across every kind.
 */
export function fetchSearch(query: string, limit = 12): Promise<SearchHit[]> {
  const parameters = new URLSearchParams({ q: query, limit: String(limit) });
  return request<SearchHit[]>(`/api/search?${parameters.toString()}`);
}

/** One derived figure, with how it was derived. */
export interface Derived {
  value: string | null;
  /** The arithmetic in words, with the inputs it used. */
  derivation: string;
}

/** What a company is worth against what it earns, owns and pays. */
export interface CompanyValuation {
  as_of: string;
  price: string;
  /** In crore. */
  shares_outstanding: Derived;
  /** In crore. */
  market_cap: Derived;
  /** Standalone profit over the last four quarters, in crore. */
  earnings_ttm: Derived;
  eps_ttm: Derived;
  pe: Derived;
  /** Shareholders' funds, in crore. */
  book_value: Derived;
  pb: Derived;
  dividends_ttm: Derived;
  /** In per cent. */
  dividend_yield: Derived;
}

/**
 * Fetch what a company is worth against its earnings, book and payout.
 *
 * @param instrumentKey - The company's listing.
 * @returns The valuation, or null when the company has no price to value
 *   against.
 */
export function fetchValuation(instrumentKey: string): Promise<CompanyValuation | null> {
  return request<CompanyValuation | null>(
    `/api/companies/${encodeURIComponent(instrumentKey)}/valuation`,
  );
}

/** One index, as a list of every index shows it. */
export interface IndexSummary {
  instrument_key: string;
  symbol: string;
  name: string;
  /** What kind of index its exchange says it is; null when never described. */
  category: string | null;
  /** How many companies it holds today; nought when membership is unpublished. */
  constituents: number;
  as_of: string | null;
  close: string | null;
  change_percent: string | null;
  returns: TrailingReturns | null;
  from_high_percent: string | null;
}

/**
 * Fetch every index listed today, by name.
 *
 * @returns The indices.
 */
export function fetchIndices(): Promise<IndexSummary[]> {
  return request<IndexSummary[]>("/api/indices");
}

/** One sector, reduced to its companies' figures with every company counting once. */
export interface SectorSummary {
  sector: string;
  /** How many of its companies have a listing today. */
  companies: number;
  /** How many of those have figures: the sample every figure here is over. */
  measured: number;
  as_of: string | null;
  median_change_percent: string | null;
  advancing: number;
  declining: number;
  unchanged: number;
  returns: TrailingReturns;
  /** The middle momentum score among its companies that have one. */
  median_momentum: string | null;
}

/**
 * Fetch every sector, by name.
 *
 * @returns The sectors.
 */
export function fetchSectors(): Promise<SectorSummary[]> {
  return request<SectorSummary[]>("/api/sectors");
}

/** One member of a population valued, with what its move was worth. */
export interface MemberValuation {
  instrument_key: string;
  symbol: string;
  name: string;
  close: string;
  change_percent: string | null;
  /** In crore; null when the share count is not held. */
  market_cap: string | null;
  pe: string | null;
  pb: string | null;
  /** Today's change in its capitalisation, in crore. */
  moved: string | null;
}

/**
 * A population valued, member by member and as a whole. The medians count
 * every member once and leave losses out; the money moved is a proxy for
 * index contribution, since real index weights are free-float and unheld.
 */
export interface PopulationValuation {
  scope_kind: ScopeKind;
  scope_key: string;
  as_of: string | null;
  /** How many members have a price. */
  companies: number;
  /** How many have a positive price-to-earnings. */
  valued: number;
  market_cap: string | null;
  pe_median: string | null;
  pb_median: string | null;
  members: MemberValuation[];
}

/**
 * Fetch a population valued.
 *
 * @param kind - An index or a sector.
 * @param key - Which one.
 * @returns The valuation.
 */
export function fetchPopulationValuation(
  kind: ScopeKind,
  key: string,
): Promise<PopulationValuation> {
  return request<PopulationValuation>(
    `/api/populations/${kind}/${encodeURIComponent(key)}/valuation`,
  );
}

/** One figure a screen may test, from the platform's registry. */
export interface ScreenField {
  name: string;
  label: string;
  group: string;
  unit:
    "price" | "percent" | "count" | "multiple" | "points" | "crore" | "ratio" | "score" | "rank";
  /** Which of a hit's records the path starts from: its daily figures, or its standing. */
  record: "figures" | "snapshot";
  /** The attributes to follow from that record to this figure. */
  path: string[];
}

/** How a figure is compared with a value. */
export type ScreenOperator = "gt" | "gte" | "lt" | "lte" | "eq";

/** One test of one figure. */
export interface ScreenCondition {
  field: string;
  operator: ScreenOperator;
  value: string;
}

/** One company that met the conditions, with every figure it has. */
export interface ScreenHit {
  instrument_key: string;
  symbol: string;
  name: string;
  sector: string | null;
  figures: InstrumentOverview;
  /** Its valuation and standing among the rest; null before the nightly snapshot has it. */
  snapshot: CompanySnapshot | null;
}

/** SEBI's size band, by rank of market capitalisation. */
export type SizeBucket = "LARGE" | "MID" | "SMALL" | "MICRO";

/** A company's valuation and standing among the rest, as of its latest session. */
export interface CompanySnapshot {
  instrument_key: string;
  as_of: string;
  /** Crore. */
  market_cap: string | null;
  pe: string | null;
  pb: string | null;
  /** Per cent. */
  dividend_yield: string | null;
  /** 1 is the largest. */
  size_rank: number | null;
  size_bucket: SizeBucket | null;
  /** Nought to a hundred. */
  momentum_score: number | null;
  /** Crore; over nought for a profitable company. */
  profit_ttm: string | null;
  /** The latest year's revenue over the year before, per cent. */
  revenue_growth: string | null;
  /**
   * Delivered as a share of traded for its NSE listing, per cent, on the
   * session `delivery_as_of`; null when NSE does not list it, or when that
   * session is more than five sessions behind the newest the platform's
   * delivery data holds -- the most the strategy lab carried a figure.
   */
  delivery_percent: string | null;
  /**
   * That share's mean over its last twenty published sessions, per cent;
   * null with fewer than twenty, and null with `delivery_percent` once it is
   * more than five sessions old.
   */
  delivery_percent_average: string | null;
  /**
   * The latest session with a published delivery figure, which
   * `delivery_percent` describes unless it has gone stale and is null; it
   * is kept then, to say how old the data is. Not always `as_of` or the
   * day's figures' session: the delivery file arrives late in the evening
   * and is not waited for.
   */
  delivery_as_of: string | null;
}

/** What a screen found. */
export interface ScreenPage {
  as_of: string | null;
  total: number;
  limit: number;
  offset: number;
  items: ScreenHit[];
}

/** What a screen asks for. */
export interface ScreenQuery {
  conditions: ScreenCondition[];
  scope_kind: ScopeKind;
  /** Which index or sector; ignored for the whole market. */
  scope_key: string;
  sort: string | null;
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

/**
 * Fetch the figures a screen may test.
 *
 * @returns The fields, in the order a builder lists them.
 */
export function fetchScreenFields(): Promise<ScreenField[]> {
  return request<ScreenField[]>("/api/screen/fields");
}

/**
 * Run a screen.
 *
 * @param query - The conditions, the population and the ordering.
 * @returns The page of companies that met every condition.
 */
export function fetchScreen(query: ScreenQuery): Promise<ScreenPage> {
  const parameters = new URLSearchParams({
    scope_kind: query.scope_kind,
    order: query.order,
    limit: String(query.limit),
    offset: String(query.offset),
  });
  if (query.scope_kind !== "companies") {
    parameters.set("scope_key", query.scope_key);
  }
  if (query.sort !== null) {
    parameters.set("sort", query.sort);
  }
  for (const one of query.conditions) {
    parameters.append("where", `${one.field}:${one.operator}:${one.value}`);
  }
  return request<ScreenPage>(`/api/screen?${parameters.toString()}`);
}

/** One watchlist, as the list of lists shows it. */
export interface WatchlistSummary {
  watchlist_id: number;
  name: string;
  description: string | null;
  /** How many instruments are on it. */
  items: number;
  created_at: string;
}

/** What a watchlist is made or changed from. */
export interface WatchlistDraft {
  name: string;
  description?: string | null;
}

/** What an item is added with, or changed to. */
export interface WatchlistItemDraft {
  instrument_key?: string;
  notes?: string | null;
  target_price?: string | null;
  stop_loss?: string | null;
  tags?: string[];
  /** Whether it is starred; sent with every change, since a change replaces the item. */
  featured?: boolean;
}

/** One instrument on a watchlist, with the reader's levels against its price. */
export interface WatchedInstrument {
  item_id: number;
  instrument_key: string;
  symbol: string;
  name: string;
  notes: string | null;
  target_price: string | null;
  stop_loss: string | null;
  tags: string[];
  added_on: string;
  close: string | null;
  change_percent: string | null;
  one_month: string | null;
  one_year: string | null;
  /** How far the target is from the close, in per cent; null when either is unknown. */
  to_target_percent: string | null;
  to_stop_percent: string | null;
  as_of: string | null;
  /** Starred by the reader; the platform lists starred items first. */
  featured: boolean;
  /** The close on the day it was added, or the last session before. */
  added_close: string | null;
  since_added_percent: string | null;
  volume: number | null;
}

/** One watchlist read whole. */
export interface WatchlistPage {
  watchlist_id: number;
  name: string;
  description: string | null;
  created_at: string;
  items: WatchedInstrument[];
}

/** Fetch the account's watchlists, oldest first. */
export function fetchWatchlists(): Promise<WatchlistSummary[]> {
  return request<WatchlistSummary[]>("/api/watchlists");
}

/** Fetch one watchlist with every instrument's figures beside the reader's levels. */
export function fetchWatchlist(watchlistId: number): Promise<WatchlistPage> {
  return request<WatchlistPage>(`/api/watchlists/${String(watchlistId)}`);
}

/** One watchlist's hold on an instrument: enough to show a star and to undo it. */
export interface HeldBy {
  watchlist_id: number;
  item_id: number;
}

/** Which of the account's watchlists hold an instrument, with each item's id. */
export function fetchWatchlistsHolding(instrumentKey: string): Promise<HeldBy[]> {
  return request<HeldBy[]>(
    `/api/watchlists/holding?instrument_key=${encodeURIComponent(instrumentKey)}`,
  );
}

/** Make a watchlist. */
export function createWatchlist(draft: WatchlistDraft): Promise<WatchlistSummary> {
  return request<WatchlistSummary>("/api/watchlists", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

/** Rename or redescribe a watchlist. */
export function updateWatchlist(
  watchlistId: number,
  draft: WatchlistDraft,
): Promise<WatchlistSummary> {
  return request<WatchlistSummary>(`/api/watchlists/${String(watchlistId)}`, {
    method: "PATCH",
    body: JSON.stringify(draft),
  });
}

/** Delete a watchlist and everything on it. */
export async function deleteWatchlist(watchlistId: number): Promise<void> {
  await request<unknown>(`/api/watchlists/${String(watchlistId)}`, { method: "DELETE" });
}

/** Put an instrument on a watchlist; a second add returns the existing item. */
export function addWatchlistItem(
  watchlistId: number,
  draft: WatchlistItemDraft,
): Promise<WatchedInstrument> {
  return request<WatchedInstrument>(`/api/watchlists/${String(watchlistId)}/items`, {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

/** Change an item's notes, levels and tags. */
export function updateWatchlistItem(
  watchlistId: number,
  itemId: number,
  draft: WatchlistItemDraft,
): Promise<WatchedInstrument> {
  return request<WatchedInstrument>(
    `/api/watchlists/${String(watchlistId)}/items/${String(itemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(draft),
    },
  );
}

/** Take an item off a watchlist. */
export async function removeWatchlistItem(watchlistId: number, itemId: number): Promise<void> {
  await request<unknown>(`/api/watchlists/${String(watchlistId)}/items/${String(itemId)}`, {
    method: "DELETE",
  });
}

/** One instrument, named. */
export interface InstrumentSummary {
  instrument_key: string;
  symbol: string;
  name: string;
  /** EQUITY, INDEX or FUTURE. */
  kind: string;
  exchange: string;
}

/**
 * Name the instruments behind a set of keys.
 *
 * @param keys - The keys, up to fifty.
 * @returns One summary per key that names something, in the order asked.
 */
export function fetchInstruments(keys: string[]): Promise<InstrumentSummary[]> {
  const parameters = new URLSearchParams();
  for (const key of keys) {
    parameters.append("keys", key);
  }
  return request<InstrumentSummary[]>(`/api/instruments?${parameters.toString()}`);
}

/** One futures contract with its latest figures. */
export interface ContractSummary {
  instrument_key: string;
  symbol: string;
  expiry: string;
  /** Calendar days from today; nought on the day, negative once past. */
  days_to_expiry: number;
  lot_size: number;
  as_of: string | null;
  close: string | null;
  change_percent: string | null;
  volume: number | null;
  /** Contracts outstanding after the latest session; null where unpublished. */
  open_interest: number | null;
  one_month: string | null;
}

/** One underlying with how many contracts run on it and the nearest one. */
export interface UnderlyingSummary {
  underlying_key: string;
  symbol: string;
  name: string;
  exchange: string;
  /** COMMODITY, DERIVATIVES or CURRENCY. */
  segment: string;
  contracts: number;
  nearest: ContractSummary;
}

/** One contract with the run it belongs to. */
export interface FutureContract {
  contract: ContractSummary;
  underlying: UnderlyingSummary;
  /** Every contract listed today on the same underlying, nearest first. */
  chain: ContractSummary[];
}

/** The families of futures. */
export type FuturesSegment = "COMMODITY" | "DERIVATIVES" | "CURRENCY";

/**
 * Fetch every underlying with futures listed today.
 *
 * @param segment - One family, or every family when omitted.
 * @returns The underlyings by symbol, each with its nearest contract.
 */
export function fetchFutures(segment?: FuturesSegment): Promise<UnderlyingSummary[]> {
  const parameters = new URLSearchParams();
  if (segment !== undefined) {
    parameters.set("segment", segment);
  }
  const query = parameters.toString();
  return request<UnderlyingSummary[]>(`/api/futures${query === "" ? "" : `?${query}`}`);
}

/**
 * Fetch one contract with its chain.
 *
 * @param instrumentKey - The contract.
 * @returns The contract, its underlying and every contract on it today.
 */
export function fetchFuture(instrumentKey: string): Promise<FutureContract> {
  return request<FutureContract>(`/api/futures/${encodeURIComponent(instrumentKey)}`);
}

/**
 * Fetch one instrument's figures over its recent sessions, oldest first.
 *
 * @param key - The instrument.
 * @param sessions - How many sessions back.
 * @returns The figures per session; fewer when fewer are held.
 */
export function fetchOverviewHistory(key: string, sessions = 60): Promise<InstrumentOverview[]> {
  const parameters = new URLSearchParams({ key, sessions: String(sessions) });
  return request<InstrumentOverview[]>(`/api/overviews/history?${parameters.toString()}`);
}

/** Who is buying or selling: foreign or domestic institutions. */
export type Participant = "FII" | "DII";

/** Which market the flow is in. DII is published for the cash market only. */
export type FlowSegment =
  "CASH" | "INDEX_FUTURES" | "STOCK_FUTURES" | "INDEX_OPTIONS" | "STOCK_OPTIONS";

/** A session's flows, or a month's. */
export type FlowPeriod = "DAY" | "MONTH";

/** One participant's buying and selling in one segment over one session or month. */
export interface InstitutionalFlow {
  participant: Participant;
  segment: FlowSegment;
  period: FlowPeriod;
  /** The session, or the first of the month. */
  day: string;
  /** Rupees crore, as every flow figure is. */
  buy_amount: string;
  sell_amount: string;
  net_amount: string;
  /** Contract counts; null for the cash market, which trades no contracts. */
  buy_contracts: number | null;
  sell_contracts: number | null;
  oi_contracts: number | null;
  oi_amount: string | null;
  long_contracts: number | null;
  short_contracts: number | null;
}

/**
 * Fetch institutional flows, newest first.
 *
 * @param period - Sessions or months.
 * @param sessions - How many distinct days to return at most.
 * @returns Every participant's every segment for each of those days.
 */
export function fetchFlows(
  period: FlowPeriod = "DAY",
  sessions = 60,
): Promise<InstitutionalFlow[]> {
  const parameters = new URLSearchParams({ period, sessions: String(sessions) });
  return request<InstitutionalFlow[]>(`/api/flows?${parameters.toString()}`);
}

/** One session's delivery for a company: how much of what traded changed hands for good. */
export interface DeliveryDay {
  session_date: string;
  traded_quantity: number;
  /** Null where the exchange published none, as for trade-for-trade shares. */
  delivered_quantity: number | null;
  delivery_percent: string | null;
}

/**
 * Fetch a company's delivery figures, newest first.
 *
 * @param instrumentKey - The company's listing.
 * @param sessions - How many sessions.
 * @returns One entry per session NSE published.
 */
export function fetchDelivery(instrumentKey: string, sessions = 60): Promise<DeliveryDay[]> {
  return request<DeliveryDay[]>(
    `/api/companies/${encodeURIComponent(instrumentKey)}/delivery?sessions=${String(sessions)}`,
  );
}

/** A bulk deal crosses half a per cent of a company's shares; a block deal is a single large trade. */
export type DealKind = "BULK" | "BLOCK";

/** One disclosed deal. */
export interface Deal {
  kind: DealKind;
  session_date: string;
  symbol: string;
  security_name: string;
  client_name: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: string;
  /** Quantity times price, in rupees crore. */
  value_crore: string;
  /** The listing the symbol maps to, or null when it maps to none. */
  instrument_key: string | null;
}

/** What to narrow disclosed deals to. */
export interface DealQuery {
  kind?: DealKind;
  days?: number;
  instrumentKey?: string;
}

/**
 * Fetch disclosed deals, newest first.
 *
 * @param query - Which kind, how far back, and for which company.
 * @returns The deals.
 */
export function fetchDeals(query: DealQuery = {}): Promise<Deal[]> {
  const parameters = new URLSearchParams({ days: String(query.days ?? 30) });
  if (query.kind !== undefined) {
    parameters.set("kind", query.kind);
  }
  if (query.instrumentKey !== undefined) {
    parameters.set("instrument_key", query.instrumentKey);
  }
  return request<Deal[]>(`/api/deals?${parameters.toString()}`);
}

/** One company joining or leaving an index. */
export interface IndexChange {
  /** The first session it was a member, or the first it no longer was. */
  day: string;
  kind: "ADDED" | "REMOVED";
  isin: string;
  /** Its listing, or null when it no longer lists. */
  instrument_key: string | null;
  symbol: string;
  name: string;
}

/**
 * Fetch who joined and left an index since its record began, newest first.
 *
 * @param indexKey - The index.
 * @returns The changes; empty when nothing has changed.
 */
export function fetchIndexChanges(indexKey: string): Promise<IndexChange[]> {
  return request<IndexChange[]>(`/api/populations/index/${encodeURIComponent(indexKey)}/changes`);
}

/** One session the platform holds figures for. */
export interface SessionSummary {
  day: string;
  /** How many instruments have figures for it. */
  instruments: number;
}

/**
 * Fetch the most recent sessions, newest first.
 *
 * @param limit - How many.
 * @returns The sessions.
 */
export function fetchSessions(limit = 500): Promise<SessionSummary[]> {
  return request<SessionSummary[]>(`/api/sessions?limit=${String(limit)}`);
}

/** Where the latest reading of a ratio sits in its own history. */
export interface RangeReading {
  /** How many sessions had the ratio. */
  sample: number;
  low: string | null;
  high: string | null;
  median: string | null;
  /** The most recent reading, or null when today has none. */
  latest: string | null;
  /** The share of readings at or below the latest, in per cent. */
  percentile: string | null;
}

/** One session's price against the annual figures then public. */
export interface ValuationSession {
  day: string;
  price: string;
  /** Which financial year's figures applied; null before the first held year was public. */
  year_end: string | null;
  eps: string | null;
  /** Null for a loss-making year: a loss has no price-to-earnings. */
  pe: string | null;
  book_per_share: string | null;
  pb: string | null;
}

/**
 * A company's price-to-earnings and price-to-book over its sessions,
 * against the annual standalone statements. A year's figures apply from
 * sixty days after its end, the deadline for audited results.
 */
export interface CompanyValuationHistory {
  instrument_key: string;
  years: number;
  sessions: ValuationSession[];
  pe: RangeReading;
  pb: RangeReading;
}

/**
 * Fetch a company's valuation ratios over its sessions.
 *
 * @param instrumentKey - The company's listing.
 * @param years - How far back to reach, one to fifteen.
 * @returns The run, oldest first, with where today sits in it.
 */
export function fetchValuationHistory(
  instrumentKey: string,
  years = 10,
): Promise<CompanyValuationHistory> {
  return request<CompanyValuationHistory>(
    `/api/companies/${encodeURIComponent(instrumentKey)}/valuation/history?years=${String(years)}`,
  );
}

/** Which of the two statement series an earnings aggregate is taken over. */
export type Cadence = "annual" | "quarterly";

/** How one figure moved against a comparison period, over a constant sample. */
export interface GrowthFigure {
  /** How many companies reported in both periods. Always stated. */
  sample: number;
  /** The figure summed over the sample this period, in crore. */
  total: string;
  /** The same sample's figure in the comparison period. */
  before: string;
  /** The change in per cent, or null when the earlier total was nought or a loss. */
  percent: string | null;
  /** The share of the sample whose figure rose, in per cent. */
  growing: string;
}

/** One period of a population's earnings. */
export interface EarningsPeriod {
  period_end: string;
  /** How many companies reported this period at all. */
  reported: number;
  revenue: string | null;
  profit: string | null;
  revenue_yoy: GrowthFigure | null;
  profit_yoy: GrowthFigure | null;
  /** Quarterly only. */
  revenue_qoq: GrowthFigure | null;
  profit_qoq: GrowthFigure | null;
}

/** A population's earnings, period by period, most recent first. */
export interface Earnings {
  scope_kind: ScopeKind;
  scope_key: string;
  cadence: Cadence;
  companies: number;
  periods: EarningsPeriod[];
}

/** One sector's latest period, for ranking sectors against each other. */
export interface SectorEarnings {
  sector: string;
  companies: number;
  period_end: string;
  revenue_yoy: GrowthFigure | null;
  profit_yoy: GrowthFigure | null;
}

/**
 * Fetch what a population earned, period by period.
 *
 * @param kind - The whole market, a sector or an index.
 * @param key - Which one; anything for the whole market.
 * @param cadence - Annual reaches back fifteen years; quarterly gives
 *   quarter-on-quarter and, where held, year-on-year.
 * @returns The series, most recent first.
 */
export function fetchEarnings(
  kind: "companies" | "sector" | "index",
  key: string,
  cadence: Cadence = "annual",
): Promise<Earnings> {
  return request<Earnings>(`/api/earnings/${kind}/${encodeURIComponent(key)}?cadence=${cadence}`);
}

/**
 * Fetch every sector ranked by how its earnings grew in its latest period.
 *
 * @param cadence - Which series.
 * @returns The sectors, best revenue growth first.
 */
export function fetchSectorEarnings(cadence: Cadence = "annual"): Promise<SectorEarnings[]> {
  return request<SectorEarnings[]>(`/api/earnings/sectors?cadence=${cadence}`);
}

/** What a list of backtests shows of one. Percentages are in percent. */
export interface BacktestSummary {
  backtest_id: number;
  name: string;
  description: string;
  /** The index it was compared with, as the rules name it: `nifty500`. */
  benchmark: string;
  run_at: string;
  /** The last session of the history it read. */
  data_to: string;
  first_session: string;
  last_session: string;
  /** Compound yearly rate over the whole stretch. */
  cagr: number;
  max_drawdown: number;
  sharpe: number | null;
  /** The rate in the years after the split; null without one. */
  out_of_sample_cagr: number | null;
  /** The lead there over random picks under the same rules, in points. */
  out_of_sample_edge: number | null;
}

/** One period of a backtest: in sample, out of sample, or the whole stretch. */
export interface BacktestPeriod {
  name: "whole" | "in-sample" | "out-of-sample";
  first_session: string;
  last_session: string;
  cagr: number | null;
  total_return: number | null;
  volatility: number | null;
  max_drawdown: number | null;
  sharpe: number | null;
  sortino: number | null;
  /** The average share of capital in stocks. */
  invested: number | null;
  trades: number;
  win_rate: number | null;
  average_trade: number | null;
  average_sessions: number | null;
  benchmark_cagr: number | null;
  /** What the verdict reads: the median calendar's rate, or the own calendar's. */
  judged_cagr: number | null;
  calendar_low: number | null;
  calendar_high: number | null;
  /** The median rate of random picks under the same rules. */
  random_median: number | null;
  /** The judged rate less that, in points. */
  edge: number | null;
  /** The share of random-pick runs the judged rate beat. */
  beaten: number | null;
  /** The share of the sessions each play was in force, by name. */
  played: Record<string, number>;
}

/** The portfolio at one close. */
export interface BacktestEquityPoint {
  session: string;
  /** Its value, starting from one. */
  value: number;
  /** The share of it in stocks, in percent. */
  invested: number;
  /** The benchmark's close over its first in the run. */
  benchmark: number | null;
}

/** One calendar year of the whole run, in percent. */
export interface BacktestYear {
  year: number;
  playbook: number;
  benchmark: number | null;
}

/** One sale: a whole holding, or part of one. */
export interface BacktestTrade {
  instrument_key: string;
  /** The symbol it trades under; null when no longer listed. */
  symbol: string | null;
  entered: string;
  exited: string;
  entry_price: number;
  exit_price: number;
  sessions: number;
  reason: string;
  gain_percent: number;
  /** The share of the purchase this sale sold. */
  portion: number;
}

/** One strategy of a playbook, and when it is played. */
export interface BacktestPlay {
  name: string;
  /** The market condition it is played in; `1` for always. */
  when: string;
  /** Every setting of the strategy, as written. */
  rules: Record<string, unknown>;
}

/** One candidate on a backtest history's last session. */
export interface BacktestPick {
  rank: number;
  instrument_key: string;
  /** The symbol it trades under; null when no longer listed. */
  symbol: string | null;
  /** The playbook's ranking figure for it. */
  score: number;
  close: number;
  /** Whether it is within the slots today's exposure allows. */
  chosen: boolean;
}

/** What a playbook would hold on its history's last session. */
export interface BacktestPicks {
  as_of: string;
  /** `buy`, or why it would not: `gate shut`, `recovering`, `no exposure`, `no play`. */
  standing: string;
  /** The strategy in force; null while none is. */
  play: string | null;
  slots: number;
  room: number;
  candidates: BacktestPick[];
}

/** One kept backtest, whole. */
export interface BacktestDetail extends BacktestSummary {
  note: string;
  switch: string;
  plays: BacktestPlay[];
  periods: BacktestPeriod[];
  /** Null for a backtest kept before picks existed. */
  picks: BacktestPicks | null;
  years: BacktestYear[];
  equity: BacktestEquityPoint[];
  trades: BacktestTrade[];
}

/**
 * Fetch every kept backtest.
 *
 * @returns The backtests, the most recently run first.
 */
export function fetchBacktests(): Promise<BacktestSummary[]> {
  return request<BacktestSummary[]>("/api/backtests");
}

/**
 * Fetch one kept backtest whole.
 *
 * @param id - Its number.
 * @returns The backtest, or null when no backtest has that number.
 */
export async function fetchBacktest(id: number): Promise<BacktestDetail | null> {
  try {
    return await request<BacktestDetail>(`/api/backtests/${String(id)}`);
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 404) {
      return null;
    }
    throw failure;
  }
}

/** A backtest asked of a saved strategy. */
export interface StrategyRequest {
  request_id: number;
  status: "queued" | "running" | "done" | "failed";
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  /** Why it failed. */
  error: string | null;
  /** The kept backtest it produced. */
  backtest_id: number | null;
}

/** The headline of a strategy's latest finished backtest. */
export interface StrategyResult {
  backtest_id: number;
  run_at: string;
  cagr: number;
  max_drawdown: number;
  out_of_sample_cagr: number | null;
  out_of_sample_edge: number | null;
}

/** A saved strategy as the list shows it. */
export interface StrategySummary {
  strategy_id: number;
  name: string;
  /** Whether it plays several saved strategies, each in its market conditions. */
  combines: boolean;
  updated_at: string;
  latest: StrategyRequest | null;
  result: StrategyResult | null;
}

/** A saved strategy whole. */
export interface StrategyDetail extends StrategySummary {
  /** The TOML, as written. */
  text: string;
  created_at: string;
  /** Its newest backtest requests, newest first. */
  requests: StrategyRequest[];
}

/** What a strategy's text says, or why it cannot be read. */
export interface StrategyCheck {
  valid: boolean;
  message: string | null;
  name: string | null;
  combines: boolean;
  plays: { name: string; when: string }[];
}

/** What a rule may read and call. */
export interface StrategyLanguage {
  series: string[];
  functions: string[];
}

/**
 * Fetch every saved strategy with its latest backtest.
 *
 * @returns The strategies, by name.
 */
export function fetchStrategies(): Promise<StrategySummary[]> {
  return request<StrategySummary[]>("/api/strategies");
}

/**
 * Fetch one saved strategy whole.
 *
 * @param id - Its number.
 * @returns The strategy, or null when none has that number.
 */
export async function fetchStrategy(id: number): Promise<StrategyDetail | null> {
  try {
    return await request<StrategyDetail>(`/api/strategies/${String(id)}`);
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 404) {
      return null;
    }
    throw failure;
  }
}

/**
 * Say whether a text can be backtested as written, without saving it.
 *
 * @param text - The TOML.
 * @returns What it says, or why it cannot be read.
 */
export function checkStrategy(text: string): Promise<StrategyCheck> {
  return request<StrategyCheck>("/api/strategies/check", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/**
 * Save a new strategy, under the name its text gives.
 *
 * @param text - The TOML.
 * @returns The strategy.
 */
export function createStrategy(text: string): Promise<StrategyDetail> {
  return request<StrategyDetail>("/api/strategies", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/**
 * Rewrite a saved strategy; renaming it is changing the name in its text.
 *
 * @param id - Its number.
 * @param text - The new TOML.
 * @returns The strategy as it now is.
 */
export function updateStrategy(id: number, text: string): Promise<StrategyDetail> {
  return request<StrategyDetail>(`/api/strategies/${String(id)}`, {
    method: "PUT",
    body: JSON.stringify({ text }),
  });
}

/**
 * Delete a saved strategy; the backtests it produced stay kept.
 *
 * @param id - Its number.
 */
export async function deleteStrategy(id: number): Promise<void> {
  await request<unknown>(`/api/strategies/${String(id)}`, { method: "DELETE" });
}

/**
 * Ask the backtester to run a saved strategy as it now is.
 *
 * @param id - Its number.
 * @returns The request, queued.
 */
export function runStrategy(id: number): Promise<StrategyRequest> {
  return request<StrategyRequest>(`/api/strategies/${String(id)}/backtests`, { method: "POST" });
}

/**
 * Fetch what a rule may read and call.
 *
 * @returns The series and functions.
 */
export function fetchStrategyLanguage(): Promise<StrategyLanguage> {
  return request<StrategyLanguage>("/api/strategies/language");
}
