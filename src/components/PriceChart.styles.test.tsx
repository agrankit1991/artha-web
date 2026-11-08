/** Tests for a price chart drawn in the reader's line styles. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PriceChart } from "./PriceChart";
import { PRICE_LINE } from "@/lib/chartPalette";
import { LineStylesProvider } from "@/lib/lineStyles";
import { ThemeProvider } from "@/lib/theme";
import { chartCalls } from "@/test/chartStub";
import { chartPoints, renderPage, stubPlatform } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  window.localStorage.clear();
});

/** Each line series' colour and width, in the order added. */
function lines(): { color?: string; lineWidth?: number }[] {
  return chartCalls.addSeries.mock.calls.map(
    (call) => (call as unknown[])[1] as { color?: string; lineWidth?: number },
  );
}

function draw(): void {
  renderPage(
    <ThemeProvider>
      <LineStylesProvider>
        <PriceChart points={chartPoints(10)} initialOverlays={["sma_50", "rsi"]} />
      </LineStylesProvider>
    </ThemeProvider>,
  );
}

describe("PriceChart, in the reader's line styles", () => {
  it("draws each line as the reader styled it, and the rest the chart's own way", async () => {
    stubPlatform({
      "/api/line-styles": {
        body: [
          { line: "price", colour: null, width: 4 },
          { line: "sma_50", colour: "#dc2626", width: 3 },
        ],
      },
    });
    draw();

    await waitFor(() => {
      expect(lines()).toContainEqual(expect.objectContaining({ color: "#dc2626", lineWidth: 3 }));
    });
    expect(lines()).toContainEqual(expect.objectContaining({ color: PRICE_LINE, lineWidth: 4 }));
    // RSI is not styled: the oscillator's own hairline.
    expect(lines().at(-1)).toEqual(expect.objectContaining({ lineWidth: 1 }));
  });

  it("opens the line styles from the chart's controls", async () => {
    stubPlatform({ "/api/line-styles": { body: [] } });
    draw();

    await userEvent.click(screen.getByRole("button", { name: "Line styles" }));
    expect(screen.getByRole("dialog", { name: "Line styles" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog", { name: "Line styles" })).toBeNull();
  });
});
