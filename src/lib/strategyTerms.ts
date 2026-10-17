/**
 * What every figure and choice on the strategy pages means, in a sentence or two.
 *
 * The owner asked for each section and option to say what it is about
 * (2026-10-17). The same figure appears on several pages -- a strategy's
 * edge on Strategies, on Backtests and on its own page -- so it is
 * explained once, here, and each column's or choice's hint reads it.
 * Written for a reader who does not write rules; every figure is the
 * platform's (`artha.backtest`), and this only says what it is.
 */

/** The figures a backtest reports. */
export const BACKTEST_TERMS = {
  cagr: "Compound yearly growth over the whole backtest, from its first session (2005 for most) to its last, on the strategy's own rebalance days: the steady yearly rate that turns the start into the end.",
  outOfSample:
    "The yearly growth from 2018 on. The rules were settled on the years before, so these are years they had not seen: the honest test.",
  edge: "What it made from 2018 beyond the middle of 20 runs that pick companies at random under the same rules (the same gate, holdings, exits and costs). The history before September 2026 holds only companies that survived, so even random picks did well: the edge is what the rules themselves added.",
  maxDrawdown:
    "Its deepest fall from a high to the low that followed, over the whole backtest: the worst loss a holder would have sat through.",
  balance:
    "Return for each point of the deepest fall (the Calmar ratio), worked out for the years to 2017 and from 2018, keeping the weaker of the two: high only if it was good in both. Lists open on it, highest first.",
  benchmarkLead:
    "Its yearly growth from 2018 less the Nifty 500's over the same years, in points. Nearly every strategy beats the index here, because the stored history holds only the companies that survived.",
  sharpe:
    "Its average daily return over how much its daily returns swing, per year: how smoothly it earned. Above 1 is good.",
  style:
    "What it reaches for first, read from how it ranks companies: Momentum (the strongest risers), Rebound (the most fallen), Pullback (a short dip), Low volatility (the calmest), Model (a forecast's score), Combination (several strategies, each in the market it names).",
  risk: "How deep its worst fall went over the backtest: under 25%, 25-35%, or over 35%.",
  latestRun: "Its newest backtest request: queued, running, done or failed.",
  changed: "When its rules were last saved.",
  traded: "The first and last sessions the backtest traded.",
  ran: "When the backtest ran, India's date.",
  judged:
    "The middle of its yearly growth across every rebalance calendar it could have started on: a strategy rebalancing every 21 sessions is run 21 times, starting a day apart, and judged on the middle one, so a lucky start day cannot flatter it.",
  randomPicks:
    "The middle of 20 runs picking companies at random under the same rules: what the gate, holdings and exits earned without the strategy's choices.",
  index: "The Nifty 500's yearly growth over the same sessions.",
  trades: "How many sales it made.",
  won: "The share of its sales that made money after costs.",
  invested: "The average share of its money held in companies rather than gold or cash.",
  basket:
    "The most companies it may hold. The same rules rerun holding at most 10, 20, 30, 40 or 50, over the whole stretch.",
  heldOnAverage: "How many companies it held on an average session.",
  yearReturn: "Its return in the calendar year.",
  yearFall: "Its deepest fall within the year.",
  yearBalance: "That year's return for each point of that year's deepest fall.",
  companiesHeld: "How many companies it held on an average session that year.",
  yearBreadth:
    "The average share that year of companies worth Rs 5,000 crore or more above their own 200-session average.",
  lead: "Its return that year less the Nifty 500's, in points.",
  marketKind:
    "The year by the Nifty 500's return: good at 25% or more, bad below nought, average between.",
  uptrend: "The share of the year's sessions the Nifty 50 closed above its 200-session average.",
  indexFall: "The Nifty 500's deepest fall within the year.",
  leaders:
    "The trait of the rules (a market gate, few holdings, a stop, switching between strategies...) whose strategies' middle return most exceeded the rest's that year. Hindsight, read once the year was over.",
} as const;

/** The figures of starting in a market phase (Start today). */
export const START_TERMS = {
  balance:
    "The middle episode's return for each point of the worst episode's loss: high only if it did well and its unluckiest start was mild. When even its worst start rose, it ranks by its return.",
  basketLead:
    "Its middle lead over a basket of every liquid company bought on the same days, in points. The basket shares the survivor-only history's flattery, so this is the fairest comparison.",
  medianReturn:
    "The middle episode's return over the months followed. Each past episode counts once, however long it lasted.",
  worstEpisode: "The worst episode's return: what the unluckiest start in this phase brought.",
  beatBasket: "In how many of the past episodes it beat the basket.",
  phase:
    "Which kind of market to compare today with. It opens on your latest call from the Market phase page, else on what the data reads today.",
  horizon: "How long each past start is followed: three, six or twelve months.",
  outcome:
    "Every past episode, or only those after which the Nifty 500 rose (a call that turned out right) or fell (one that turned out wrong). Nobody knows which when starting: read the two as 'if I am right' and 'if I am wrong'.",
} as const;

/** The choices that narrow the Strategies page. */
export const FILTER_TERMS = {
  style: "Show only the strategies of one style. Start today follows the same choice.",
  risk: "Show only the strategies whose deepest fall was in one band. Start today follows.",
  index:
    "Show only the strategies whose yearly growth from 2018 beat the Nifty 500's. Start today follows.",
} as const;

/** The columns of a backtest's own tables: its periods, baskets, years and trades. */
export const RECORD_TERMS = {
  period:
    "Whole: 2005 to the last session. In-sample: the years to 2017, where settings may have been chosen. Out of sample: 2018 on, the test.",
  basketInSample: "That run's yearly growth over the years to 2017.",
  basketOutOfSample: "That run's yearly growth from 2018.",
  yearIndex: "The Nifty 500's return that calendar year.",
  yearTrades: "How many sales it made that year, and the share of them that made money.",
  bought: "The session it was bought, at the open.",
  sold: "The session it was sold, at the open; the last session for one still held at the end.",
  sessions: "How many sessions it was held.",
  prices: "What it was bought and sold at, adjusted for bonuses and splits.",
  gain: "What the sale made on what the shares cost.",
  portion: "The share of the holding sold: the whole of it, or a part at a target.",
  shares:
    "How many shares, for the strategy's starting money (Rs 10 lakh unless its rules say otherwise).",
  firstWeight: "Its share of the whole portfolio at its first close.",
  weightRange: "Its lowest and highest share of the portfolio while held.",
  reason:
    "Why it was sold. Each reason's mark says what it means, and the guide above the table lists them all.",
} as const;

/** A reason a backtest sold a holding. */
export interface SaleReason {
  /** The word on the trades table's badge. */
  word: string;
  /** What made the sale, and at what price. */
  meaning: string;
}

/**
 * Why a backtest sold, keyed by the platform's reason (`artha.backtest.ledger.Trade.reason`).
 *
 * The owner did not know what Regime, Exit and the rest meant (2026-10-17).
 * Each meaning is what the simulation does (`artha.backtest.simulation`):
 * a sale decided at a close is made at the next open, a stop or a target
 * during the session. The examples are M147's own rules.
 */
export const SALE_REASONS: Record<string, SaleReason> = {
  rebalance: {
    word: "Rebalance",
    meaning:
      "At a scheduled rebalance it no longer ranked among the companies the strategy's slots hold (or no longer passed its rules), so it was sold at the next open to make room for one that did.",
  },
  exit: {
    word: "Exit",
    meaning:
      "The strategy's own exit rule held at a close (M147's: a close below its 100-session average), so it was sold at the next open. Checked every session, not only at a rebalance.",
  },
  stop: {
    word: "Stop",
    meaning:
      "The session's low reached its stop-loss, so it was sold at the stop, or at the open if it opened below. A trailing stop rises with the highest close since it was bought.",
  },
  target: {
    word: "Target",
    meaning:
      "It reached its take-profit price: sold at the open if it opened above, else at the target. The rules may sell only part there (Of the holding says how much), the rest riding on.",
  },
  time: {
    word: "Time",
    meaning:
      "It had been held as many sessions as the strategy allows (its hold_sessions), so it was sold at the next open.",
  },
  regime: {
    word: "Regime",
    meaning:
      "The strategy's market gate shut (M147's: the Nifty 50 closing 2% below its 150-session average), so every holding was sold at the next open, and nothing is bought until the gate opens again.",
  },
  exposure: {
    word: "Exposure",
    meaning:
      "The strategy's exposure rule cut how many holdings it may keep (M147 fills 60% of its slots while the Nifty 50 is below its 50-session average), so its lowest-ranked holdings were sold at the next open.",
  },
  recover: {
    word: "Recover cost",
    meaning:
      "The strategy's recover-cost rule held (a sideways market, say): a holding in profit sold just enough to take back what it cost, the rest riding on; one not in profit was sold whole.",
  },
  switch: {
    word: "Switch",
    meaning:
      "A combination changed which strategy is in play (or none is), and the one now in play would not hold it, so it was sold at the next open.",
  },
  discontinuity: {
    word: "Neutralised",
    meaning:
      "It opened at half or less, or double or more, of its last close: a demerger, a split the history missed or a data error rather than a real move. Taken out at that last close, and left out of the trade figures (trades, won).",
  },
  end: {
    word: "Still held",
    meaning:
      "Still held when the backtest ended: valued at its last close less the cost of selling, as if sold then, and counted with the trades.",
  },
};

/** The columns of a strategy's picks today. */
export const PICK_TERMS = {
  rank: "Its place among the companies passing the strategy's rules on the last session, best first.",
  close: "Its close on the last session the backtest read.",
  score:
    "The figure the strategy ranks companies by: for momentum, the return from a year ago to a month ago.",
  today:
    "Hold: what a fresh start would buy at the next open. Next: while it would buy nothing (its gate shut, say), the first it would buy once it may. Runner-up: passes the rules but ranks below the slots it fills.",
} as const;

/** The columns of a strategy's backtest requests. */
export const RUN_TERMS = {
  asked: "When the backtest was asked for.",
  status: "Queued, running, done or failed.",
  took: "How long the backtester took to run it.",
  outcome: "Its verdict once done, or why it failed.",
} as const;

/** The choices and columns of the Market phase page. */
export const PHASE_TERMS = {
  call: "The phase as you read it. It is kept beside what the rules read that session, so your journal shows where your judgement and the rules differed; Start today on the Strategies page opens on your latest call.",
  span: "How many years of the phases the strip covers, back from the latest session.",
  session: "The session the call is about: the latest one read when you made it.",
  yourCall: "The phase you called.",
  dataRead: "What the rules read that session; Between phases when it fitted none of the five.",
  why: "Your note.",
  recorded: "When you recorded the call.",
} as const;
