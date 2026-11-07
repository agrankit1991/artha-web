/** Tests for the chart in the watchlist's Chart view, and comparing on it. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceChart } from "./WorkspaceChart";
import { seriesKinds } from "@/test/chartStub";
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
