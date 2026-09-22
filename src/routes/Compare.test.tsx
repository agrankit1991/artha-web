/** Tests for comparing several instruments. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Compare, MOST } from "./Compare";
import {
  instrumentSummary,
  overview,
  priceSeries,
  renderPage,
  screenFields,
  stubPlatform,
} from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

const RELIANCE = "NSE_EQ|INE002A01018";
const TCS = "NSE_EQ|INE467B01029";
const NIFTY = "NSE_INDEX|Nifty 50";

function stubEverything(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/instruments": {
      bodyFor: (path) =>
        [
          instrumentSummary(),
          instrumentSummary({
            instrument_key: TCS,
            symbol: "TCS",
            name: "Tata Consultancy Services",
          }),
          instrumentSummary({
            instrument_key: NIFTY,
            symbol: "NIFTY 50",
            name: "Nifty 50",
            kind: "INDEX",
          }),
        ].filter((one) =>
          decodeURIComponent(path).replaceAll("+", " ").includes(one.instrument_key),
        ),
    },
    "/api/series": { body: [priceSeries(RELIANCE, [100, 110]), priceSeries(TCS, [100, 90])] },
    "/api/overviews": {
      body: [overview({ instrument_key: RELIANCE }), overview({ instrument_key: TCS })],
    },
    "/api/screen/fields": { body: screenFields() },
    "/api/search": {
      body: [
        { kind: "index", key: NIFTY, label: "NIFTY 50", detail: "Nifty 50", weight: 9 },
        { kind: "sector", key: "IT - Software", label: "IT - Software", detail: null, weight: 1 },
      ],
    },
  });
}

/** The paths asked for, decoded. */
function asked(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map((call) => decodeURIComponent(String(call[0])).replaceAll("+", " "));
}

describe("Compare", () => {
  it("draws the instruments in the address, with their returns and every figure", async () => {
    const fetched = stubEverything();
    renderPage(<Compare />, { at: `/compare?keys=${RELIANCE}&keys=${TCS}` });

    expect(await screen.findByRole("button", { name: "Remove RELIANCE" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove TCS" })).toBeInTheDocument();
    const returns = screen.getByRole("table", { name: "Returns compared" });
    expect(await within(returns).findByRole("link", { name: /RELIANCE/ })).toHaveAttribute(
      "href",
      "/company/RELIANCE",
    );
    const matrix = screen.getByRole("table", { name: "Figures compared" });
    expect(within(matrix).getByRole("rowheader", { name: "RSI (14)" })).toBeInTheDocument();
    expect(within(matrix).getAllByRole("columnheader", { name: /TCS/ })).toHaveLength(1);
    await waitFor(() => {
      expect(asked(fetched).some((path) => path.includes("/api/series?sessions=250"))).toBe(true);
    });
  });

  it("adds an index from a search and removes a company, keeping the set in the address", async () => {
    const fetched = stubEverything();
    renderPage(<Compare />, { at: `/compare?keys=${RELIANCE}&keys=${TCS}` });
    await screen.findByRole("button", { name: "Remove TCS" });

    await userEvent.type(screen.getByRole("searchbox", { name: "Add a company or index" }), "nif");
    // A sector has no series and is not offered.
    const hit = await screen.findByRole("button", { name: /NIFTY 50/ });
    expect(screen.queryByRole("button", { name: /IT - Software/ })).not.toBeInTheDocument();
    await userEvent.click(hit);
    expect(await screen.findByRole("button", { name: "Remove NIFTY 50" })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        asked(fetched).some(
          (path) => path.includes("/api/series") && path.includes(`keys=${NIFTY}`),
        ),
      ).toBe(true);
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove TCS" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Remove TCS" })).not.toBeInTheDocument();
    });
  });

  it("asks for a longer range when one is chosen", async () => {
    const fetched = stubEverything();
    renderPage(<Compare />, { at: `/compare?keys=${RELIANCE}` });
    await screen.findByRole("button", { name: "Remove RELIANCE" });

    await userEvent.click(screen.getByRole("button", { name: "5Y" }));

    await waitFor(() => {
      expect(asked(fetched).some((path) => path.includes("sessions=1250"))).toBe(true);
    });
  });

  it("starts empty, and stops at the most one chart can carry", async () => {
    stubEverything();
    const { unmount } = renderPage(<Compare />);
    expect(await screen.findByText("Nothing to compare yet")).toBeInTheDocument();
    unmount();

    const many = Array.from({ length: MOST }, (_, n) => `keys=K${String(n)}`).join("&");
    stubPlatform({
      "/api/instruments": {
        body: Array.from({ length: MOST }, (_, n) =>
          instrumentSummary({ instrument_key: `K${String(n)}`, symbol: `S${String(n)}` }),
        ),
      },
      "/api/series": { body: [] },
      "/api/overviews": { body: [] },
      "/api/screen/fields": { body: screenFields() },
    });
    renderPage(<Compare />, { at: `/compare?${many}` });
    expect(await screen.findByText(/is the most one chart can carry/)).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    // No figures for any of them: a dash in every cell, and a price of nothing.
    const matrix = screen.getByRole("table", { name: "Figures compared" });
    expect(within(matrix).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("reports each read that fails on its own", async () => {
    stubPlatform({
      "/api/instruments": { body: [instrumentSummary()] },
      "/api/series": { status: 500, body: { detail: "series broke" } },
      "/api/overviews": { status: 500, body: { detail: "figures broke" } },
      "/api/screen/fields": { status: 500, body: { detail: "fields broke" } },
    });
    const { unmount } = renderPage(<Compare />, { at: `/compare?keys=${RELIANCE}` });
    expect(await screen.findByText(/series broke/)).toBeInTheDocument();
    expect(await screen.findByText(/figures broke/)).toBeInTheDocument();
    expect(await screen.findByText(/fields broke/)).toBeInTheDocument();
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({ "/api/instruments": { status: 500, body: { detail: "names broke" } } });
    renderPage(<Compare />, { at: `/compare?keys=${RELIANCE}` });
    expect(await screen.findByText(/names broke/)).toBeInTheDocument();
  });

  it("sorts the returns by any column", async () => {
    stubEverything();
    renderPage(<Compare />, { at: `/compare?keys=${RELIANCE}&keys=${TCS}` });
    const returns = await screen.findByRole("table", { name: "Returns compared" });
    await within(returns).findByRole("link", { name: /RELIANCE/ });

    for (const name of [
      /^Instrument/,
      /^Name/,
      /^Price/,
      /^Change/,
      /^1W/,
      /^1M/,
      /^3M/,
      /^6M/,
      /^1Y/,
      /^YTD/,
      /^From high/,
      /^As of/,
    ]) {
      await userEvent.click(within(returns).getByRole("button", { name }));
    }
    expect(within(returns).getAllByRole("row")).toHaveLength(3);
  });
});
