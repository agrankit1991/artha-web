/** Tests for the list of underlyings with futures. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { daysLeft, Futures } from "./Futures";
import { contractSummary, renderPage, stubPlatform, underlyingSummary } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

const TWO = [
  underlyingSummary(),
  underlyingSummary({
    underlying_key: "MCX_COM|1",
    symbol: "GOLD",
    name: "GOLD",
    contracts: 1,
    nearest: contractSummary({
      instrument_key: "MCX_FO|9",
      symbol: "GOLD26DECFUT",
      days_to_expiry: 0,
      close: null,
      change_percent: null,
      volume: null,
      open_interest: null,
      one_month: null,
      as_of: null,
    }),
  }),
];

describe("Futures", () => {
  it("lists each underlying with its nearest contract, leading to that contract", async () => {
    const fetched = stubPlatform({ "/api/futures": { body: TWO } });
    renderPage(<Futures />);

    const table = await screen.findByRole("table", { name: "Underlyings" });
    const crude = await within(table).findByRole("link", { name: /CRUDEOIL/ });
    expect(crude).toHaveAttribute("href", "/future/MCX_FO%7C1");
    const row = crude.closest("tr");
    expect(row).toHaveTextContent("10 days left");
    expect(row).toHaveTextContent("12,345");
    // Nothing traded yet: dashes, and the day itself.
    const gold = within(table).getByRole("link", { name: /GOLD/ }).closest("tr");
    expect(gold).toHaveTextContent("expires today");
    expect(gold).toHaveTextContent("-");
    await waitFor(() => {
      expect(fetched.mock.calls.some((call) => String(call[0]).includes("segment=COMMODITY"))).toBe(
        true,
      );
    });
  });

  it("switches family and narrows by typed letters", async () => {
    const fetched = stubPlatform({ "/api/futures": { body: TWO } });
    renderPage(<Futures />);
    await screen.findByRole("link", { name: /CRUDEOIL/ });

    await userEvent.click(screen.getByRole("button", { name: "Currency" }));
    await waitFor(() => {
      expect(fetched.mock.calls.some((call) => String(call[0]).includes("segment=CURRENCY"))).toBe(
        true,
      );
    });
    expect(screen.getByText(/Rupee pairs/)).toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: "Find an underlying" }), "gol");
    expect(screen.queryByRole("link", { name: /CRUDEOIL/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /GOLD/ })).toBeInTheDocument();
  });

  it("sorts by any column, and reports a list that cannot be read", async () => {
    stubPlatform({ "/api/futures": { body: TWO } });
    const { unmount } = renderPage(<Futures />);
    const table = await screen.findByRole("table", { name: "Underlyings" });
    await within(table).findByRole("link", { name: /CRUDEOIL/ });
    for (const name of [
      /^Symbol/,
      /^Name/,
      /^Exchange/,
      /^Nearest expiry/,
      /^Price/,
      /^Change/,
      /^1M/,
      /^Volume/,
      /^Open interest/,
      /^Contracts/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({ "/api/futures": { status: 500, body: { detail: "futures broke" } } });
    renderPage(<Futures />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Futures broke");
    // The page stays, so the family can be changed away from the failure.
    expect(screen.getByRole("heading", { name: "Futures", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Currency" })).toBeInTheDocument();
  });

  it("counts the underlyings, and what the letters leave of them", async () => {
    stubPlatform({ "/api/futures": { body: TWO } });
    renderPage(<Futures />);
    const table = await screen.findByRole("table", { name: "Underlyings" });
    await within(table).findByRole("link", { name: /CRUDEOIL/ });

    expect(screen.getByText("2 underlyings")).toBeInTheDocument();
    expect(screen.queryByText("2 of 2")).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: "Find an underlying" }), "gol");
    expect(screen.getByText("1 of 2")).toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: "Find an underlying" }), "xx");
    expect(within(table).getByText("No underlying matches")).toBeInTheDocument();
  });

  it("opens on the family and the letters in its address", async () => {
    const fetched = stubPlatform({ "/api/futures": { body: TWO } });
    const { unmount } = renderPage(<Futures />, { at: "/futures?family=CURRENCY&q=gol" });

    const table = await screen.findByRole("table", { name: "Underlyings" });
    expect(await within(table).findByRole("link", { name: /GOLD/ })).toBeInTheDocument();
    expect(within(table).queryByRole("link", { name: /CRUDEOIL/ })).not.toBeInTheDocument();
    expect(fetched.mock.calls.some((call) => String(call[0]).includes("segment=CURRENCY"))).toBe(
      true,
    );
    unmount();

    // A family it does not know reads as the first.
    renderPage(<Futures />, { at: "/futures?family=BONDS" });
    expect(await screen.findByRole("button", { name: "Commodities" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("says a family has nothing today when nothing is listed in it", async () => {
    stubPlatform({ "/api/futures": { body: [] } });
    renderPage(<Futures />);

    expect(await screen.findByText("No futures in this family today")).toBeInTheDocument();
    expect(screen.getByText("0 underlyings")).toBeInTheDocument();
  });
});

describe("daysLeft", () => {
  it("counts down in words", () => {
    expect(daysLeft(-3)).toBe("expired");
    expect(daysLeft(0)).toBe("expires today");
    expect(daysLeft(1)).toBe("1 day left");
    expect(daysLeft(41)).toBe("41 days left");
  });
});
