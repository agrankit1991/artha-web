/** Tests for the bulk and block deals page. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Deal } from "@/api/client";
import { renderPage, stubPlatform } from "@/test/support";

import { Deals } from "./Deals";

afterEach(() => {
  vi.unstubAllGlobals();
});

function deal(overrides: Partial<Deal>): Deal {
  return {
    kind: "BULK",
    session_date: "2026-09-22",
    symbol: "AASTHA",
    security_name: "Aastha Spintex Limited",
    client_name: "L7 HITECH PRIVATE LIMITED",
    side: "BUY",
    quantity: 207511,
    price: "81.51",
    value_crore: "1.69",
    instrument_key: "NSE_EQ|INE0AASTH01",
    ...overrides,
  };
}

describe("Deals", () => {
  it("lists each deal with its side as a badge, leading to the company when it has one", async () => {
    const fetched = stubPlatform({
      "/api/deals": {
        body: [
          deal({}),
          deal({
            symbol: "NEWLY",
            security_name: "Newly Listed",
            instrument_key: null,
            side: "SELL",
            kind: "BLOCK",
          }),
        ],
      },
    });
    renderPage(<Deals />);

    const table = await screen.findByRole("table", { name: "Disclosed deals" });
    expect(await within(table).findByRole("link", { name: "AASTHA" })).toHaveAttribute(
      "href",
      "/company/AASTHA",
    );
    // A symbol no listing carries has no page.
    expect(within(table).queryByRole("link", { name: "NEWLY" })).not.toBeInTheDocument();
    expect(within(table).getByText("NEWLY")).toBeInTheDocument();
    expect(within(table).getByText("Buy")).toHaveClass("text-gain");
    expect(within(table).getByText("Sell")).toHaveClass("text-loss");
    expect(within(table).getByText("Block")).toBeInTheDocument();
    expect(screen.getByText("2 deals")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Block" }));
    await userEvent.click(screen.getByRole("button", { name: "Quarter" }));
    const asked = fetched.mock.calls.map((call) => String(call[0]));
    expect(asked.at(-1)).toBe("/api/deals?days=90&kind=BLOCK");

    for (const name of [
      /^Date/,
      /^Symbol/,
      /^Security/,
      /^Client/,
      /^Kind/,
      /^Side/,
      /^Quantity/,
      /^Price/,
      /^Value/,
    ]) {
      await userEvent.click(
        within(screen.getByRole("table", { name: "Disclosed deals" })).getByRole("button", {
          name,
        }),
      );
    }
  });

  it("says so when the deals cannot be read", async () => {
    stubPlatform({ "/api/deals": { status: 500, body: { detail: "deals broke" } } });
    renderPage(<Deals />);

    expect(await screen.findByRole("alert")).toHaveTextContent("deals broke");
  });
});
