/** Tests for one futures contract's page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Future, spread } from "./Future";
import { chartPoints, futureContract, overview, renderPage, stubPlatform } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/futures/": { body: futureContract() },
    "/api/overviews": { body: [overview({ instrument_key: "MCX_FO|1" })] },
    "/api/figures": { body: { instrument_key: "MCX_FO|1", points: chartPoints(30) } },
    "/api/series": { body: [] },
  });
}

describe("Future", () => {
  it("names the contract, its calendar and its chain with the spread to this one", async () => {
    stubEverything();
    renderPage(<Future instrumentKey="MCX_FO|1" />);

    expect(await screen.findByRole("heading", { name: "CRUDEOIL26SEPFUT" })).toBeInTheDocument();
    // In the header badge and again in the chain.
    expect(screen.getAllByText(/10 days left/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Lot 100")).toBeInTheDocument();
    const chain = screen.getByRole("table", { name: "Expiry chain" });
    const october = within(chain).getByRole("link", { name: /CRUDEOIL26OCTFUT/ });
    expect(october).toHaveAttribute("href", "/future/MCX_FO%7C2");
    // October at 6,180 against September's 6,100 is a 1.31% premium.
    expect(october.closest("tr")).toHaveTextContent("+1.31%");
    expect(within(chain).getByText("this page")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "The Contract Itself" })).toBeInTheDocument();
  });

  it("asks for more sessions when a longer range is chosen, and offers Compare and Share", async () => {
    const fetched = stubEverything();
    renderPage(<Future instrumentKey="MCX_FO|1" />);
    await screen.findByRole("heading", { name: "CRUDEOIL26SEPFUT" });

    await userEvent.click(screen.getByRole("button", { name: "1Y" }));
    await waitFor(() => {
      expect(fetched.mock.calls.some((call) => String(call[0]).includes("sessions=250"))).toBe(
        true,
      );
    });
    expect(screen.getByRole("link", { name: /Compare/ })).toHaveAttribute(
      "href",
      "/compare?keys=MCX_FO%7C1",
    );
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByRole("dialog", { name: "Share" })).toBeInTheDocument();
  });

  it("marks a contract about to expire, and copes with a chain of one", async () => {
    const soon = futureContract();
    stubPlatform({
      "/api/futures/": {
        body: {
          ...soon,
          contract: { ...soon.contract, days_to_expiry: 3, close: null, change_percent: null },
          chain: [{ ...soon.contract, days_to_expiry: 3, close: null, change_percent: null }],
        },
      },
      "/api/overviews": { body: [] },
      "/api/figures": { body: { instrument_key: "MCX_FO|1", points: [] } },
    });
    renderPage(<Future instrumentKey="MCX_FO|1" />);

    expect((await screen.findAllByText(/3 days left/)).length).toBeGreaterThanOrEqual(1);
    const chain = screen.getByRole("table", { name: "Expiry chain" });
    expect(within(chain).getAllByRole("row")).toHaveLength(2);
    // Nothing to spread against: sorting by the gap still works.
    for (const name of [/^vs this/, /^Volume/, /^Price/, /^Change/]) {
      await userEvent.click(within(chain).getByRole("button", { name }));
    }
    expect(within(chain).getAllByRole("row")).toHaveLength(2);
  });

  it("reports each read that fails on its own", async () => {
    stubPlatform({
      "/api/futures/": { body: futureContract() },
      "/api/overviews": { status: 500, body: { detail: "figures broke" } },
      "/api/figures": { status: 500, body: { detail: "chart broke" } },
    });
    const { unmount } = renderPage(<Future instrumentKey="MCX_FO|1" />);
    expect(await screen.findByText(/figures broke/)).toBeInTheDocument();
    expect(await screen.findByText(/chart broke/)).toBeInTheDocument();
    unmount();

    vi.unstubAllGlobals();
    stubPlatform({
      "/api/futures/": { status: 404, body: { detail: "no futures contract called x" } },
    });
    renderPage(<Future instrumentKey="x" />);
    expect(await screen.findByText(/no futures contract called/)).toBeInTheDocument();
  });

  it("sorts the chain by any column", async () => {
    stubEverything();
    renderPage(<Future instrumentKey="MCX_FO|1" />);
    const chain = await screen.findByRole("table", { name: "Expiry chain" });
    for (const name of [
      /^Contract/,
      /^Expiry/,
      /^Price/,
      /^Change/,
      /^vs this/,
      /^Volume/,
      /^Open interest/,
    ]) {
      await userEvent.click(within(chain).getByRole("button", { name }));
    }
    expect(within(chain).getAllByRole("row")).toHaveLength(3);
  });
});

describe("spread", () => {
  it("is the other contract's premium to this one, in per cent", () => {
    expect(spread(6100, "6180")).toBeCloseTo(1.3115, 3);
    expect(spread(null, "6180")).toBeNull();
    expect(spread(6100, null)).toBeNull();
    expect(spread(0, "1")).toBeNull();
  });
});
