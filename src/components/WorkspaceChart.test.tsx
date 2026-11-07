/** Tests for the chart in the watchlist's Chart view, and comparing on it. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceChart } from "./WorkspaceChart";
import { chartCalls, seriesKinds } from "@/test/chartStub";
import { chartPoints, renderPage, stubPlatform } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  window.localStorage.clear();
});

const NIFTY = {
  kind: "index",
  key: "NSE_INDEX|Nifty 50",
  label: "NIFTY 50",
  detail: "Nifty 50",
  exchanges: [],
  category: null,
  close: null,
  change_percent: null,
};

const SALE = {
  instrument_key: "NSE_EQ|INE002A01018",
  symbol: "RELIANCE",
  entered: "2026-09-02",
  exited: "2026-09-08",
  entry_price: 100,
  exit_price: 105,
  sessions: 4,
  reason: "target",
  gain_percent: 5,
  portion: 1,
};

function stub(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/figures": { body: { points: chartPoints(10) } },
    "/api/price-bands": { status: 404 },
    "/api/search": { body: [NIFTY] },
    "/api/strategies/305/trades": {
      body: { strategy_id: 305, name: "M147", backtest_id: 9, trades: [SALE] },
    },
    "/api/strategies/306/trades": {
      body: { strategy_id: 306, name: "Idle", backtest_id: 9, trades: [] },
    },
    "/api/strategies/307/trades": {
      body: { strategy_id: 307, name: "Fresh", backtest_id: null, trades: [] },
    },
    "/api/strategies": {
      body: [305, 306, 307].map((id, at) => ({
        strategy_id: id,
        name: ["M147", "Idle", "Fresh"][at],
        combines: false,
        style: "momentum",
      })),
    },
    "/api/companies": {
      body: [
        {
          kind: "BONUS",
          label: "Bonus 1:1",
          ex_date: "2026-09-05",
          record_date: null,
          announced_on: null,
          amount: null,
          ratio: "1:1",
        },
      ],
    },
  });
}

/** The requests made, decoded. */
function asked(fetched: ReturnType<typeof stubPlatform>): string[] {
  // URLSearchParams writes a space as "+".
  return fetched.mock.calls.map(([path]) => decodeURIComponent(path).replaceAll("+", " "));
}

describe("WorkspaceChart", () => {
  it("charts the instrument it is given, linking to its page", async () => {
    const fetched = stub();
    renderPage(
      <WorkspaceChart instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" isIndex={false} />,
    );

    expect(await screen.findByRole("link", { name: "RELIANCE" })).toHaveAttribute(
      "href",
      "/company/RELIANCE",
    );
    await waitFor(() => {
      expect(
        asked(fetched).some((path) => path.startsWith("/api/figures?key=NSE_EQ|INE002A01018")),
      ).toBe(true);
    });
  });

  it("links an index to its own page", () => {
    stub();
    renderPage(<WorkspaceChart instrumentKey="NSE_INDEX|Nifty Bank" symbol="Nifty Bank" isIndex />);
    expect(screen.getByRole("link", { name: "Nifty Bank" })).toHaveAttribute(
      "href",
      "/index/nifty-bank",
    );
  });

  it("lays another instrument over the price, and takes it off again", async () => {
    const fetched = stub();
    renderPage(
      <WorkspaceChart instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" isIndex={false} />,
    );

    await userEvent.type(screen.getByRole("combobox", { name: "Compare with" }), "nif");
    await userEvent.click(await screen.findByRole("option", { name: /NIFTY 50/ }));

    expect(await screen.findByText("Read in per cent from the first session shown.")).toBeVisible();
    await waitFor(() => {
      expect(asked(fetched).some((path) => path.includes("key=NSE_INDEX|Nifty 50"))).toBe(true);
    });
    await waitFor(() => {
      // The price, its averages and what traded, then the comparison's line.
      expect(seriesKinds().filter((kind) => kind === "line").length).toBeGreaterThanOrEqual(1);
    });

    await userEvent.click(screen.getByRole("button", { name: "Stop comparing with NIFTY 50" }));
    expect(screen.queryByText("Read in per cent from the first session shown.")).toBeNull();
  });

  it("shows why the chart could not be read", async () => {
    stubPlatform({
      "/api/figures": { status: 500, body: { detail: "figures unavailable" } },
      "/api/price-bands": { status: 404 },
    });
    renderPage(<WorkspaceChart instrumentKey="NSE_EQ|X" symbol="X" isIndex={false} />);
    expect(await screen.findByText(/figures unavailable/i)).toBeVisible();
  });
});

describe("WorkspaceChart, marks", () => {
  /** Choose a strategy in the chooser. */
  async function chooseStrategy(name: string): Promise<void> {
    await userEvent.click(
      await screen.findByRole("combobox", { name: "Show a strategy's trades" }),
    );
    await userEvent.click(await screen.findByRole("option", { name }));
  }

  it("marks a company's bonuses, and a chosen strategy's buys and sells", async () => {
    const fetched = stub();
    renderPage(
      <WorkspaceChart instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" isIndex={false} />,
    );

    await waitFor(() => {
      expect(chartCalls.createSeriesMarkers).toHaveBeenCalled();
    });
    await chooseStrategy("M147");

    await waitFor(() => {
      expect(asked(fetched).some((path) => path.startsWith("/api/strategies/305/trades"))).toBe(
        true,
      );
    });
    await waitFor(() => {
      const last = chartCalls.createSeriesMarkers.mock.calls.at(-1) as [
        unknown,
        { text: string }[],
      ];
      expect(last[1].map((one) => one.text)).toEqual(["Buy", "Bonus 1:1", "Sell: Target"]);
    });
  });

  it("says when a strategy never traded the company, or has not been run", async () => {
    stub();
    renderPage(
      <WorkspaceChart instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" isIndex={false} />,
    );

    await chooseStrategy("Idle");
    expect(
      await screen.findByText("Idle never traded RELIANCE in its latest backtest."),
    ).toBeVisible();
    await chooseStrategy("Fresh");
    expect(await screen.findByText("Fresh has not been backtested yet.")).toBeVisible();
    await chooseStrategy("No strategy's trades");
    expect(screen.queryByText(/has not been backtested/)).toBeNull();
  });

  it("asks nothing about an index's corporate actions", async () => {
    const fetched = stub();
    renderPage(<WorkspaceChart instrumentKey="NSE_INDEX|Nifty 50" symbol="Nifty 50" isIndex />);
    await screen.findByRole("combobox", { name: "Show a strategy's trades" });
    expect(asked(fetched).some((path) => path.includes("corporate-actions"))).toBe(false);
  });
});

describe("WorkspaceChart, a comparison with a gap", () => {
  it("leaves out a compared session with no close rather than drawing it at nought", async () => {
    stubPlatform({
      "/api/figures": {
        bodyFor: (path) => {
          const points = chartPoints(3);
          return decodeURIComponent(path).includes("Nifty")
            ? { points: points.map((one, at) => (at === 1 ? { ...one, close: null } : one)) }
            : { points };
        },
      },
      "/api/price-bands": { status: 404 },
      "/api/search": { body: [NIFTY] },
    });
    renderPage(
      <WorkspaceChart instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" isIndex={false} />,
    );

    await userEvent.type(screen.getByRole("combobox", { name: "Compare with" }), "nif");
    await userEvent.click(await screen.findByRole("option", { name: /NIFTY 50/ }));

    await waitFor(() => {
      const handed = chartCalls.setData.mock.calls.map(([points]) => (points as unknown[]).length);
      expect(handed).toContain(2);
    });
  });
});
