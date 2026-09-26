/**
 * The texts a new strategy starts from: one strategy, or a combination of
 * saved ones.
 *
 * Each is commented setting by setting, because the text is the whole
 * interface: someone starting from a template learns the language from it,
 * and every lever the backtester has is written out, ready to switch on by
 * removing a `#`. The platform repository's `strategies/README.md` is the
 * full reference.
 */

/** A strategy: S0010's picks (momentum near the high), every other lever written out. */
export const STRATEGY_TEMPLATE = `# A strategy: which companies may be held, how they rank, and how the money
# is managed. Every rule is an expression, in quotes, over the stored
# history; "What a rule may use" below the editor lists the series and
# functions.

name = "My momentum"
description = "12-1 momentum among liquid companies near their 52-week high."

# Which companies may be held at all, and which of those are candidates.
universe = "lag(sma(traded_value, 20), 1) >= 1e8"
filter = "close >= 0.85 * highest(high, 252)"
# Highest first.
rank = "lag(close, 21) / lag(close, 252) - 1"

slots = 20            # holdings at most, each bought at portfolio value / slots
rebalance = 21        # every N sessions, or "weekly", "monthly", "quarterly", "yearly"
cost_percent = 0.2    # per side: brokerage, taxes and slippage
start = 2005-01-01

# The market: while this fails, everything is sold and nothing bought.
regime = "latch(nifty50 > 1.02 * sma(nifty50, 150), nifty50 < 0.98 * sma(nifty50, 150))"
# What idle money earns a session, in percent: here gold (nothing across
# the 2011-2014 hole in its bars). Leave it out for cash earning nothing.
idle_return = "where(abs(ret(gold, 1)) < 10, ret(gold, 1), 0)"

# More levers -- remove the # to use one.
# exposure = "where(nifty50 > sma(nifty50, 200), 1, 0.5)"  # share of the slots filled
# size = "where(quarter == 4, 1.5, 1)"      # share of a slot each purchase takes
# recover_cost = "efficiency(nifty50, 60) < 0.05"  # sideways: take each winner's cost out
# exit = "close < sma(close, 200)"          # sell a holding the session this holds
# hold_sessions = 120                       # sell after this many sessions

# [stop]
# kind = "percent"      # or "atr" (multiple), "volatility" (z), "level" (level = "a rule")
# value = 20
# trailing = true       # measured from the highest close since entry

# [target]
# kind = "percent"      # or "reward": a multiple of the risk to the stop
# value = 25
# runner = "rank(ret(close, 126)) > 0.9"  # the strongest skip the target and run on
# portion = 0.5                           # sell only this share at the target
`;

/** What the combination template plays when fewer than two strategies are saved. */
const PLACEHOLDERS = ["A saved strategy", "Another saved strategy"];

/**
 * A combination playing saved strategies by the market's trend.
 *
 * @param saved - The saved strategies' names, by name; the first two are
 *   played, and placeholders stand in for any missing, which the check
 *   then names as not saved.
 * @returns The text.
 */
export function combinationTemplate(saved: string[]): string {
  const [first, second] = [...saved, ...PLACEHOLDERS];
  return `# A combination: plays saved strategies, each while its condition holds.
# On each switch day the first play whose condition holds is played; when
# that changes, the portfolio is rebuilt at the next open. When no
# condition holds, everything is sold and the money waits.

name = "My combination"
description = "Momentum while the market trends up; something calmer otherwise."
switch = "monthly"    # when the conditions are read: N sessions, or "daily" .. "yearly"

[[play]]
strategy = ${JSON.stringify(first)}    # a saved strategy, by its name
when = "nifty50 > sma(nifty50, 200)"
# when = "quarter != 4"               # or by the calendar: month, quarter, year

[[play]]
strategy = ${JSON.stringify(second)}   # no when: the fallback, played otherwise
`;
}
