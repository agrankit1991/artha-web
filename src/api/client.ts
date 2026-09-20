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
  arms_index: string | null;
  advance_decline_line: string;
  mcclellan_oscillator: string | null;
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
