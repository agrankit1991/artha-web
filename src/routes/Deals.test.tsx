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
  it("keeps the kind and the window in the address, and ranks where the deal money went", async () => {
    // A filtered view is bookmarkable; the companies most bought and most
    // sold say what the list of deals cannot at a glance.
    const fetched = stubPlatform({
      "/api/deals": {
        body: [
          deal({ side: "BUY", value_crore: "40.00" }),
          deal({ side: "SELL", value_crore: "10.00" }),
          deal({
            symbol: "ZETA",
            security_name: "Zeta Limited",
            instrument_key: "NSE_EQ|INE0ZETA001",
            side: "SELL",
            value_crore: "25.50",
          }),
          deal({
            symbol: "UNMAPPED",
            security_name: "Unmapped Limited",
            instrument_key: null,
            side: "BUY",
            value_crore: "5.00",
          }),
        ],
      },
    });
    renderPage(<Deals />, { at: "/deals?kind=BULK&window=7" });

    await screen.findByRole("table", { name: "Disclosed deals" });
    expect(fetched.mock.calls.map((call) => String(call[0]))).toContain(
      "/api/deals?days=7&kind=BULK",
    );
    expect(screen.getByRole("button", { name: "Bulk" })).toHaveAttribute("aria-pressed", "true");
    const bought = screen.getByRole("list", { name: "Companies most bought in disclosed deals" });
    const [aastha, unmapped] = within(bought).getAllByRole("listitem");
    expect(aastha).toHaveTextContent("Aastha Spintex Limited");
    expect(aastha).toHaveTextContent("+30.00 Cr");
    expect(within(aastha as HTMLElement).getByRole("link")).toHaveAttribute(
      "href",
      "/company/AASTHA",
    );
    // A symbol that maps to no listing is named, with nowhere to lead.
    expect(within(unmapped as HTMLElement).queryByRole("link")).not.toBeInTheDocument();
    const sold = screen.getByRole("list", { name: "Companies most sold in disclosed deals" });
    expect(sold).toHaveTextContent("Zeta Limited");
    expect(sold).toHaveTextContent("-25.50 Cr");
  });

  it("says when nothing was net bought, or nothing net sold", async () => {
    stubPlatform({ "/api/deals": { body: [deal({ side: "SELL", value_crore: "3.00" })] } });
    const { unmount } = renderPage(<Deals />);

    expect(await screen.findByText("No company was net bought.")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Companies most sold in disclosed deals" }),
    ).toHaveTextContent("-3.00 Cr");
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({ "/api/deals": { body: [deal({ side: "BUY", value_crore: "3.00" })] } });
    renderPage(<Deals />);
    expect(await screen.findByText("No company was net sold.")).toBeInTheDocument();
  });

  it("reads a kind or window it does not know as the default", async () => {
    const fetched = stubPlatform({ "/api/deals": { body: [] } });
    renderPage(<Deals />, { at: "/deals?kind=ODD&window=5" });

    await screen.findByRole("table", { name: "Disclosed deals" });
    expect(fetched.mock.calls.map((call) => String(call[0]))).toContain("/api/deals?days=30");
    expect(screen.getByRole("button", { name: "All deals" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps the page's header when the deals cannot be read", async () => {
    stubPlatform({ "/api/deals": { status: 500, body: { detail: "deals broke" } } });
    renderPage(<Deals />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Deals broke");
    expect(screen.getByRole("heading", { name: "Bulk & block deals" })).toBeInTheDocument();
  });

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

    // The company first, as every list of companies leads with it.
    for (const name of [
      /^Symbol/,
      /^Name/,
      /^Date/,
      /^Client/,
      /^Kind/,
      /^Side/,
      /^Shares/,
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

    expect(await screen.findByRole("alert")).toHaveTextContent("Deals broke");
  });
});
