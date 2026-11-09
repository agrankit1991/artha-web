import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { EconomicSeries } from "@/api/client";
import { chartCalls } from "@/test/chartStub";
import { renderPage, stubPlatform } from "@/test/support";

import { Economy } from "./Economy";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

function series(
  overrides: Partial<EconomicSeries> & Pick<EconomicSeries, "code" | "name">,
): EconomicSeries {
  return {
    unit: "percent",
    frequency: "monthly",
    publisher: "mospi",
    measure: "What it measures.",
    derived: false,
    points: [],
    ...overrides,
  };
}

const ECONOMY: EconomicSeries[] = [
  series({
    code: "reserves_total",
    name: "Forex reserves",
    unit: "usd_million",
    frequency: "weekly",
    publisher: "rbi",
    points: [
      { period_end: "2026-10-23", value: "719747.000000" },
      { period_end: "2026-10-30", value: "717056.000000" },
    ],
  }),
  series({
    code: "cpi_inflation",
    name: "Retail inflation",
    points: [
      { period_end: "2026-08-31", value: "4.830000" },
      { period_end: "2026-09-30", value: "5.540000" },
    ],
  }),
  series({
    code: "wpi_inflation",
    name: "Wholesale inflation",
    derived: true,
    points: [{ period_end: "2026-09-30", value: "2.27" }],
  }),
  series({
    code: "gdp_growth",
    name: "GDP growth",
    frequency: "quarterly",
    points: [{ period_end: "2026-06-30", value: "7.800000" }],
  }),
  series({ code: "iip_growth", name: "Industrial growth" }),
  series({ code: "unemployment", name: "Unemployment" }),
];

function tile(name: string): HTMLElement {
  const label = screen
    .getAllByText(name)
    .find((element) => element.closest(".rounded-lg") !== null);
  if (label === undefined) {
    throw new Error(`no tile for ${name}`);
  }
  return label.closest(".rounded-lg") as HTMLElement;
}

describe("Economy", () => {
  it("leads with each indicator's latest figure, its period and the one before", async () => {
    stubPlatform({ "/api/economy": { body: ECONOMY } });
    renderPage(<Economy />);

    expect(await screen.findByText("US$ 717.1 bn")).toBeInTheDocument();
    const reserves = tile("Forex reserves");
    expect(reserves).toHaveTextContent("as on 30 Oct 2026; as on 23 Oct 2026: US$ 719.7 bn");
    expect(reserves).toHaveTextContent("-0.37%");

    const inflation = tile("Retail inflation");
    expect(inflation).toHaveTextContent("5.54%");
    expect(inflation).toHaveTextContent(/Sept? 2026; Aug 2026: 4\.83%/);
    expect(inflation).not.toHaveTextContent("%-");

    expect(tile("Wholesale inflation")).toHaveTextContent("worked out from MoSPI's index");
    expect(tile("GDP growth")).toHaveTextContent("Apr-Jun 2026");
    expect(tile("Industrial growth")).toHaveTextContent("Not collected yet");
  });

  it("points to the USDINR futures for the rupee, saying they are futures", async () => {
    stubPlatform({ "/api/economy": { body: ECONOMY } });
    renderPage(<Economy />);

    const link = await screen.findByRole("link", { name: "USDINR futures on NSE and BSE" });
    expect(link).toHaveAttribute("href", "/futures?family=CURRENCY&q=USDINR");
    expect(screen.getByText(/forward premium/)).toBeInTheDocument();
  });

  it("draws each group's history, the reserves in US$ billion", async () => {
    stubPlatform({ "/api/economy": { body: ECONOMY } });
    renderPage(<Economy />);

    await screen.findByText("US$ 717.1 bn");
    expect(screen.getByText("Forex reserves, US$ billion")).toBeInTheDocument();
    expect(chartCalls.addSeries).toHaveBeenCalled();
  });

  it("says when the figures could not be read", async () => {
    stubPlatform({ "/api/economy": { status: 500, body: { detail: "the database is down" } } });
    renderPage(<Economy />);

    expect(await screen.findByText(/the database is down/i)).toBeInTheDocument();
  });
});
