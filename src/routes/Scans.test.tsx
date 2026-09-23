/** Tests for the scans page. */

import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPage, stubPlatform } from "@/test/support";

import { Scans } from "./Scans";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Scans", () => {
  it("counts what each scan finds and leads into the screener with its conditions", async () => {
    stubPlatform({
      "/api/screen/fields": {
        body: [
          {
            name: "rsi",
            label: "RSI (14)",
            group: "Momentum",
            unit: "points",
            path: ["momentum", "rsi"],
          },
        ],
      },
      "/api/screen": {
        bodyFor: (path: string) => ({
          as_of: "2026-09-22",
          // Oversold in an uptrend finds 12; everything else 3.
          total: path.includes("rsi%3Alt%3A35") ? 12 : 3,
          limit: 1,
          offset: 0,
          items: [],
        }),
      },
    });
    renderPage(<Scans />);

    const momentum = screen.getByRole("region", { name: "Momentum" });
    expect(await within(momentum).findByText("12 stocks")).toBeInTheDocument();
    expect(await within(momentum).findByText("RSI (14) < 35")).toBeInTheDocument();
    const hrefs = within(momentum)
      .getAllByRole("link", { name: /Run in the screener/ })
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain(
      "/screen?where=rsi%3Alt%3A35&where=from_sma_200_percent%3Agt%3A0&where=traded_value%3Agte%3A10&sort=traded_value&order=desc",
    );
  });

  it("says so when the fields cannot be read", async () => {
    stubPlatform({ "/api/screen/fields": { status: 500, body: { detail: "fields broke" } } });
    renderPage(<Scans />);

    expect(await screen.findByRole("alert")).toHaveTextContent("fields broke");
  });
});
