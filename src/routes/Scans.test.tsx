/** Tests for the scans page. */

import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { STRATEGY_SCANS, scanPath } from "@/lib/scans";
import { niftyFifty, renderPage, screenFields, strategyFields, stubPlatform } from "@/test/support";

import { Scans } from "./Scans";

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * The platform the page asks: the registry, a count for each scan (twelve
 * for oversold-in-an-uptrend, seven for the near-high strategy, three for
 * the rest), and the Nifty 50 3% below its 150-day average.
 */
function stubScans(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/screen/fields": { body: [...screenFields(), ...strategyFields()] },
    "/api/screen": {
      bodyFor: (path: string) => ({
        as_of: "2026-09-22",
        total: path.includes("rsi%3Alt%3A35")
          ? 12
          : path.includes("from_high_percent%3Agte%3A-15")
            ? 7
            : 3,
        limit: 1,
        offset: 0,
        items: [],
      }),
    },
    "/api/overviews": { body: [niftyFifty("-3.00")] },
  });
}

// The page is large -- five strategy cards, a table of twenty-three
// columns and two dozen scan cards -- and a role query with a name computes
// the accessible name of everything it passes, which under the whole
// suite's load ran close to the time limit. Sections and cards are found by
// their labels instead.

/** A section of the page, by its label. */
function section(label: string): HTMLElement {
  return screen.getByLabelText(label, { selector: "section" });
}

/** A strategy's card, by the scan's label. */
function card(label: string): HTMLElement {
  return screen.getByLabelText(label, { selector: "[role=article]" });
}

describe("Scans", () => {
  it("counts what each scan finds and leads into the screener with its conditions", async () => {
    stubScans();
    renderPage(<Scans />);

    const momentum = section("Momentum");
    expect(await within(momentum).findByText("12 stocks")).toBeInTheDocument();
    expect(await within(momentum).findByText("RSI (14) < 35")).toBeInTheDocument();
    const hrefs = within(momentum)
      .getAllByRole("link", { name: /Run in the screener/ })
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain(
      "/screen?where=rsi%3Alt%3A35&where=from_sma_200_percent%3Agt%3A0&where=traded_value%3Agte%3A10&sort=traded_value&order=desc&scan=oversold-uptrend",
    );
  });

  it("leads with the strategies: when they were tested, the switch, the years, a card each", async () => {
    stubScans();
    renderPage(<Scans />);

    expect(document.querySelector("section")).toHaveAttribute("aria-label", "Strategies");
    const strategies = section("Strategies");
    expect(
      within(strategies).getByText(
        /Backtested in the strategy lab on 24 Sept? 2026, on prices to 21 Sept? 2026/,
      ),
    ).toBeInTheDocument();
    expect(await within(strategies).findByText("Off: in gold")).toBeInTheDocument();
    expect(within(strategies).getByLabelText("Returns by year")).toBeInTheDocument();
    expect(strategies.querySelectorAll("[role=article]")).toHaveLength(STRATEGY_SCANS.length);
  });

  it("shows a strategy's record, rules, caveats, candidates and the way into the screener", async () => {
    stubScans();
    renderPage(<Scans />);

    const nearHigh = card("12-1 momentum near the 52-week high");
    expect(within(nearHigh).getByText("S0010")).toBeInTheDocument();
    expect(within(nearHigh).getByText(/still close to their 52-week high/)).toBeInTheDocument();
    expect(await within(nearHigh).findByText("7 candidates")).toBeInTheDocument();
    // Unseen years against the market, both edges, the deepest fall.
    expect(within(nearHigh).getByText("+26.2%")).toBeInTheDocument();
    expect(within(nearHigh).getByText("2018 on; Nifty 500 +10.7%")).toBeInTheDocument();
    expect(within(nearHigh).getByText("+13.5 pp")).toBeInTheDocument();
    expect(within(nearHigh).getByText("+12.3 pp")).toBeInTheDocument();
    expect(within(nearHigh).getByText("whole unseen years, 2020-21 left out")).toBeInTheDocument();
    expect(within(nearHigh).getByText("-32.3%")).toBeInTheDocument();
    // The last whole year and the running one, each beside the market.
    expect(within(nearHigh).getByText("+39.9%")).toBeInTheDocument();
    expect(within(nearHigh).getByText("Nifty 500 +6.7%")).toBeInTheDocument();
    expect(within(nearHigh).getByText(/^2026 to 21 Sept?$/)).toBeInTheDocument();
    expect(within(nearHigh).getByText("-22.8%")).toBeInTheDocument();
    expect(within(nearHigh).getByText(/Tested from Jan 2005/)).toBeInTheDocument();

    const rules = within(nearHigh).getByLabelText("How it works");
    expect(within(rules).getByText(/within 15% of their 52-week high/)).toBeInTheDocument();
    expect(within(rules).getByText(/more than 2% above its 150-day average/)).toBeInTheDocument();
    const caveats = within(nearHigh).getByLabelText("Caveats");
    expect(within(caveats).getByText(/still listed today/)).toBeInTheDocument();
    expect(
      await within(nearHigh).findByText("Value traded, 20-session average (before today) ≥ 10"),
    ).toBeVisible();
    expect(within(nearHigh).getByRole("link", { name: /Open in the screener/ })).toHaveAttribute(
      "href",
      scanPath(STRATEGY_SCANS[0] as (typeof STRATEGY_SCANS)[number]),
    );
    // The featured strategy takes the whole row.
    expect(nearHigh).toHaveClass("lg:col-span-2");

    const surge = card("Volume and delivery surge");
    expect(surge).not.toHaveClass("lg:col-span-2");
    expect(
      within(surge).getByText("None: it never steps out of the market as a whole."),
    ).toBeInTheDocument();
    expect(within(surge).getByText(/upper circuit/)).toBeInTheDocument();
    // Its unseen years begin in 2023, so there were no 2020-21 to leave out.
    expect(
      within(surge).getByText("whole unseen years; 2020-21 not among them"),
    ).toBeInTheDocument();
  });

  it("shows a dash for a count the screener could not give", async () => {
    stubPlatform({
      "/api/screen/fields": { body: screenFields() },
      "/api/screen": { status: 500, body: { detail: "screen broke" } },
      "/api/overviews": { body: [] },
    });
    renderPage(<Scans />);

    const nearHigh = card("12-1 momentum near the 52-week high");
    expect(await within(nearHigh).findByText("—")).toBeInTheDocument();
  });

  it("says so when the fields cannot be read", async () => {
    stubPlatform({ "/api/screen/fields": { status: 500, body: { detail: "fields broke" } } });
    renderPage(<Scans />);

    expect(await screen.findByRole("alert")).toHaveTextContent("fields broke");
  });
});
