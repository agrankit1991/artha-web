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

function stub(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/figures": { body: { points: chartPoints(10) } },
    "/api/price-bands": { status: 404 },
    "/api/search": { body: [NIFTY] },
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
  it("marks a company's bonuses, and offers no strategy's trades", async () => {
    stub();
    renderPage(
      <WorkspaceChart instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" isIndex={false} />,
    );

    await waitFor(() => {
      const last = chartCalls.createSeriesMarkers.mock.calls.at(-1) as
        [unknown, { text: string }[]] | undefined;
      expect(last?.[1].map((one) => one.text)).toEqual(["Bonus 1:1"]);
    });
    // Removed by the owner (2026-11-08): most strategies never traded the
    // company charted, so a pick usually marked nothing.
    expect(screen.queryByRole("combobox", { name: "Show a strategy's trades" })).toBeNull();
  });

  it("asks nothing about an index's corporate actions", async () => {
    const fetched = stub();
    renderPage(<WorkspaceChart instrumentKey="NSE_INDEX|Nifty 50" symbol="Nifty 50" isIndex />);
    await screen.findByRole("link", { name: "Nifty 50" });
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

describe("WorkspaceChart, a comparison with less history", () => {
  /** The platform: the Nifty's figures from a day on, the company's from 1 September. */
  function stubFrom(niftyFrom: string, niftyCount: number): void {
    stubPlatform({
      "/api/figures": {
        bodyFor: (path) =>
          decodeURIComponent(path).includes("Nifty")
            ? { points: chartPoints(niftyCount, niftyFrom) }
            : { points: chartPoints(10) },
      },
      "/api/price-bands": { status: 404 },
      "/api/search": { body: [NIFTY] },
    });
  }

  async function compareWithNifty(): Promise<void> {
    await userEvent.type(screen.getByRole("combobox", { name: "Compare with" }), "nif");
    await userEvent.click(await screen.findByRole("option", { name: /NIFTY 50/ }));
  }

  it("starts every line at the first session they all have, and says so", async () => {
    stubFrom("2026-09-07", 4);
    renderPage(
      <WorkspaceChart instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" isIndex={false} />,
    );
    await compareWithNifty();

    // Node writes September "Sept" in en-IN.
    expect(await screen.findByText(/from 7 Sept? 2026, the first every line has/)).toBeVisible();
    await waitFor(() => {
      const firsts = chartCalls.setData.mock.calls.map(
        ([points]) => (points as { time: string }[])[0]?.time,
      );
      // The price and the compared line, both from 7 September.
      expect(firsts.filter((day) => day === "2026-09-07").length).toBeGreaterThanOrEqual(2);
    });
    expect(
      chartCalls.setData.mock.calls.at(-1)?.[0] as { time: string }[] | undefined,
    ).not.toContainEqual(expect.objectContaining({ time: "2026-09-01" }));
  });

  it("keeps the whole history where the compared line has as much", async () => {
    stubFrom("2026-09-01", 10);
    renderPage(
      <WorkspaceChart instrumentKey="NSE_EQ|INE002A01018" symbol="RELIANCE" isIndex={false} />,
    );
    await compareWithNifty();

    expect(await screen.findByText(/Read in per cent from the first session shown/)).toBeVisible();
    expect(screen.queryByText(/the first every line has/)).toBeNull();
  });
});
