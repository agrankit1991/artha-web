/** Tests for the scans page. */

import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SCANS, STRATEGY_SCANS, type Scan, scanPath } from "@/lib/scans";
import { renderPage, screenFields, strategyFields, stubPlatform } from "@/test/support";

import { Scans } from "./Scans";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Every scan finds three companies, but oversold-in-an-uptrend twelve and the surge one. */
const COUNTS: Record<string, number> = {
  ...Object.fromEntries(SCANS.map((one) => [one.key, 3])),
  "oversold-uptrend": 12,
  "volume-delivery-surge": 1,
};

/**
 * The platform the page asks: the registry, and a count for every scan.
 *
 * @param counts - What the counting endpoint answers with.
 * @returns The stubbed fetch, to read what was asked of it.
 */
function stubScans(counts: Record<string, number> = COUNTS): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/screen/fields": { body: [...screenFields(), ...strategyFields()] },
    "/api/screen/counts": { body: { counts } },
    "/api/overviews": { body: [] },
  });
}

/** A scan from the catalogue by key, failing the test when it is gone. */
function scan(key: string): Scan {
  const found = SCANS.find((one) => one.key === key);
  if (found === undefined) {
    throw new Error(`the ${key} scan is missing from the catalogue`);
  }
  return found;
}

// Sections and cards are found by their labels and slots rather than by a
// role with a name: the page holds thirty-odd cards, and a named role query
// computes the accessible name of everything it passes.

/** A section of the page, by its label. */
function section(label: string): HTMLElement {
  return screen.getByLabelText(label, { selector: "section" });
}

/** A scan's card, by its title. */
function card(label: string): HTMLElement {
  const title = screen.getByText(label, { selector: "[data-slot=card-title]" });
  return title.closest<HTMLElement>("[data-slot=card]") as HTMLElement;
}

/** The width a card's bar is drawn at. */
function barOf(label: string): string {
  return card(label).querySelector<HTMLElement>("span[style]")?.style.width ?? "";
}

describe("Scans", () => {
  it("counts every scan in one request, and leads each into the screener with its conditions", async () => {
    const fetched = stubScans();
    renderPage(<Scans />);

    const oversold = card("Oversold in an uptrend");
    expect(await within(oversold).findByText("12 companies")).toBeInTheDocument();
    expect(await within(oversold).findByText("RSI (14) < 35")).toBeInTheDocument();
    expect(within(oversold).getByRole("link", { name: /Run in the screener/ })).toHaveAttribute(
      "href",
      scanPath(scan("oversold-uptrend")),
    );
    expect(section("Momentum")).toContainElement(oversold);

    const counted = fetched.mock.calls.filter(([path]) => path === "/api/screen/counts");
    expect(counted).toHaveLength(1);
    const asked = JSON.parse((counted[0]?.[1] as RequestInit).body as string) as {
      screens: Record<string, string[]>;
    };
    expect(Object.keys(asked.screens)).toEqual(SCANS.map((one) => one.key));
    expect(asked.screens["oversold-uptrend"]).toEqual([
      "rsi:lt:35",
      "from_sma_200_percent:gt:0",
      "traded_value:gte:10",
    ]);
  });

  it("draws each count as a bar against the largest, and one company as one", async () => {
    stubScans();
    renderPage(<Scans />);

    expect(await within(card("Volume and delivery surge")).findByText("1 company")).toBeVisible();
    expect(barOf("Oversold in an uptrend")).toBe("100%");
    expect(barOf("Volume and delivery surge")).toBe(`${String((1 / 12) * 100)}%`);
    expect(barOf(STRATEGY_SCANS[0]?.label ?? "")).toBe("25%");
  });

  it("files the strategies' scans as scans, and says where the platform's backtests are", async () => {
    stubScans();
    renderPage(<Scans />);

    expect(document.querySelector("section")).toHaveAttribute("aria-label", "Strategies");
    const strategies = section("Strategies");
    expect(strategies.querySelectorAll("[data-slot=card]")).toHaveLength(STRATEGY_SCANS.length);
    expect(
      within(strategies).getByText(/strategy lab tested before it was archived/),
    ).toBeVisible();
    expect(within(strategies).getByRole("link", { name: "Backtests" })).toHaveAttribute(
      "href",
      "/backtests",
    );
    expect(await within(strategies).findAllByText("3 companies")).toHaveLength(
      STRATEGY_SCANS.length - 1,
    );
  });

  it("holds each count's place while counting, then fills it", async () => {
    stubScans();
    const page = renderPage(<Scans />);

    expect(page.container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThanOrEqual(
      SCANS.length,
    );
    expect(await screen.findByText("12 companies")).toBeInTheDocument();
  });

  it("says once that the counts failed, and marks every scan not counted", async () => {
    stubPlatform({
      "/api/screen/fields": { body: screenFields() },
      "/api/screen/counts": { status: 500, body: { detail: "counts broke" } },
    });
    renderPage(<Scans />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Counts broke");
    expect(screen.getAllByText("Not counted")).toHaveLength(SCANS.length);
  });

  it("marks a scan the platform left out as not counted, not as none", async () => {
    stubScans(
      Object.fromEntries(Object.entries(COUNTS).filter(([key]) => key !== "oversold-uptrend")),
    );
    renderPage(<Scans />);

    const oversold = card("Oversold in an uptrend");
    expect(await within(oversold).findByText("Not counted")).toBeInTheDocument();
    expect(within(oversold).queryByText(/companies/)).not.toBeInTheDocument();
  });

  it("says so when the fields cannot be read", async () => {
    stubPlatform({
      "/api/screen/fields": { status: 500, body: { detail: "fields broke" } },
      "/api/screen/counts": { body: { counts: COUNTS } },
    });
    renderPage(<Scans />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Fields broke");
  });
});
