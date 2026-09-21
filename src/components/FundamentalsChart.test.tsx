/** Tests for the statement history drawn over the years. */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GrowthChart, ShareholdingChart } from "./FundamentalsChart";
import { chartCalls, seriesPanes } from "@/test/chartStub";
import { ThemeProvider } from "@/lib/theme";
import { statement } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.clearAllMocks();
});

describe("GrowthChart", () => {
  it("draws revenue and profit in two panes, oldest year first", () => {
    render(
      <ThemeProvider>
        <GrowthChart statements={[statement()]} />
      </ThemeProvider>,
    );

    expect(screen.getByText("Revenue (consolidated)")).toBeInTheDocument();
    expect(seriesPanes()).toEqual([0, 1]);
    const [revenue] = chartCalls.setData.mock.calls;
    expect(revenue?.[0]).toEqual([
      { time: "2025-03-31", value: 100 },
      { time: "2026-03-31", value: 120 },
    ]);
  });

  it("falls back to the standalone statement when no consolidated one was filed", () => {
    render(
      <ThemeProvider>
        <GrowthChart statements={[statement({ basis: "STANDALONE" })]} />
      </ThemeProvider>,
    );

    expect(screen.getByText("Revenue (standalone)")).toBeInTheDocument();
  });

  it("leaves out a line no period reported", () => {
    render(
      <ThemeProvider>
        <GrowthChart
          statements={[
            statement({
              line_items: ["Revenue"],
              periods: [
                {
                  period_end: "2026-03-31",
                  figures: [{ line_item: "Revenue", value: "120", units: "crore" }],
                },
              ],
            }),
          ]}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByText(/Profit after tax/)).not.toBeInTheDocument();
  });

  it("says nothing was filed rather than drawing an empty frame", () => {
    render(
      <ThemeProvider>
        <GrowthChart statements={[]} />
      </ThemeProvider>,
    );

    expect(
      screen.getByText("No annual income statement filed for this company"),
    ).toBeInTheDocument();
  });
});

describe("ShareholdingChart", () => {
  it("draws each kind of holder as its own line", () => {
    render(
      <ThemeProvider>
        <ShareholdingChart
          statements={[
            statement({
              statement: "SHAREHOLDING",
              basis: "NOT_APPLICABLE",
              frequency: "QUARTERLY",
              line_items: ["promoters", "fii"],
              periods: [
                {
                  period_end: "2026-06-30",
                  figures: [
                    { line_item: "promoters", value: "50.48", units: "percent" },
                    { line_item: "fii", value: "17.20", units: "percent" },
                  ],
                },
              ],
            }),
          ]}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("Promoters")).toBeInTheDocument();
    expect(screen.getByText("Foreign institutions")).toBeInTheDocument();
    expect(screen.queryByText("Mutual funds")).not.toBeInTheDocument();
  });

  it("says nothing was filed rather than drawing an empty frame", () => {
    render(
      <ThemeProvider>
        <ShareholdingChart statements={null} />
      </ThemeProvider>,
    );

    expect(screen.getByText("No shareholding pattern filed for this company")).toBeInTheDocument();
  });
});
