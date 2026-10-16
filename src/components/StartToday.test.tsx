/** Tests for ranking the saved strategies by how starting in a market phase went. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PlatformStub } from "@/test/support";
import {
  marketPhaseView,
  phaseCall,
  phaseReview,
  phaseStarts,
  renderPage,
  strategyPhaseStarts,
  stubPlatform,
} from "@/test/support";

import { StartToday } from "./StartToday";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The platform: the phase, the reader's calls and the review for whatever phase is asked. */
function platform(calls = [phaseCall()]): PlatformStub {
  return stubPlatform({
    "/api/market/phase/strategies": {
      bodyFor: (path) => {
        const query = new URLSearchParams(path.slice(path.indexOf("?")));
        return phaseReview({
          phase: (query.get("phase") ?? "bottoming") as "bottoming",
          months: Number(query.get("months")),
        });
      },
    },
    "/api/market/phase/calls": { body: calls },
    "/api/market/phase": { body: marketPhaseView() },
  });
}

function asked(fetched: PlatformStub): string[] {
  return fetched.mock.calls
    .map((call) => call[0])
    .filter((path) => path.startsWith("/api/market/phase/strategies"));
}

function names(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole("link")
    .map((link) => link.textContent);
}

describe("StartToday", () => {
  it("opens on the reader's own call and ranks by the lead over the basket", async () => {
    const fetched = platform();
    renderPage(<StartToday shown={null} />);

    const table = await screen.findByRole("table", { name: "Strategies for this phase" });
    await within(table).findByRole("link", { name: "Rebound" });

    expect(asked(fetched).at(-1)).toBe("/api/market/phase/strategies?phase=bottoming&months=6");
    expect(names(table)).toEqual(["Rebound", "Momentum near the high"]);
    expect(within(table).getByRole("link", { name: "Rebound" })).toHaveAttribute(
      "href",
      "/strategy/6",
    );
    expect(within(table).getByText("+12.1 pp")).toHaveClass("text-gain");
    expect(within(table).getAllByText("14 of 21")).toHaveLength(2);
    expect(within(table).getByText("Fall 25-35%")).toBeInTheDocument();
    expect(within(table).getByText("Fall over 35%")).toBeInTheDocument();
    expect(screen.getByText(/1 strategy has no starts measured/)).toBeInTheDocument();
    expect(screen.getByText(/21 past episodes since 2009/)).toBeInTheDocument();
    expect(screen.getByText(/The data reads/)).toHaveTextContent(/Falling.*your call.*Bottoming/);
    expect(
      screen.getByRole("link", { name: "Read the signals and record your call" }),
    ).toHaveAttribute("href", "/phase");
  });

  it("falls back to the data's reading before any call", async () => {
    const fetched = platform([]);
    renderPage(<StartToday shown={null} />);

    await screen.findByText(/you have not recorded a call yet/);
    await waitFor(() => {
      expect(asked(fetched).at(-1)).toBe("/api/market/phase/strategies?phase=falling&months=6");
    });
  });

  it("asks again for the phase and horizon chosen and splits by what came next", async () => {
    const fetched = platform();
    renderPage(<StartToday shown={null} />);
    await screen.findByRole("link", { name: "Rebound" });

    await userEvent.click(
      within(screen.getByRole("group", { name: "Market phase" })).getByRole("button", {
        name: "Recovering",
      }),
    );
    await userEvent.click(
      within(screen.getByRole("group", { name: "Followed for" })).getByRole("button", {
        name: "12 months",
      }),
    );
    await waitFor(() => {
      expect(asked(fetched).at(-1)).toBe("/api/market/phase/strategies?phase=recovering&months=12");
    });
    await userEvent.click(screen.getByRole("button", { name: "If it fell" }));

    expect(screen.getByRole("note")).toHaveTextContent("when the call turned out wrong");
    const table = screen.getByRole("table", { name: "Strategies for this phase" });
    await waitFor(() => {
      expect(names(table)).toEqual(["Momentum near the high", "Rebound"]);
    });
    await userEvent.click(screen.getByRole("button", { name: "If the market rose" }));
    expect(screen.getByRole("note")).toHaveTextContent("turned out right");
  });

  it("shows only the strategies the page's filters let through", async () => {
    platform();
    renderPage(<StartToday shown={new Set([5])} />);

    const table = await screen.findByRole("table", { name: "Strategies for this phase" });
    await within(table).findByRole("link", { name: "Momentum near the high" });
    expect(names(table)).toEqual(["Momentum near the high"]);
  });

  it("opens on the phase in the address", async () => {
    const fetched = platform();
    renderPage(<StartToday shown={null} />, { at: "/strategies?phase=narrowing&months=3" });

    await screen.findByRole("link", { name: "Rebound" });
    expect(asked(fetched).at(-1)).toBe("/api/market/phase/strategies?phase=narrowing&months=3");
  });

  it("says so when the strategies cannot be read for the phase", async () => {
    stubPlatform({
      "/api/market/phase/strategies": { status: 500, body: { detail: "review broke" } },
      "/api/market/phase/calls": { body: [] },
      "/api/market/phase": { body: marketPhaseView({ reading: null, signals: [] }) },
    });
    renderPage(<StartToday shown={null} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Review broke");
    await waitFor(() => {
      expect(screen.getByText(/The data reads/)).toHaveTextContent("Between phases");
    });
  });
});

describe("StartToday's table", () => {
  it("sorts by every column and marks a figure it lacks", async () => {
    stubPlatform({
      "/api/market/phase/strategies": {
        body: phaseReview({
          market: {
            ...phaseStarts(),
            episodes: 1,
            benchmark: null,
            yardstick: null,
            listed: [],
          },
          strategies: [
            ...phaseReview().strategies,
            strategyPhaseStarts({
              strategy_id: 12,
              name: "Sparse",
              max_drawdown: null,
              every: phaseStarts({
                episodes: 1,
                growth: null,
                excess: null,
                worst: null,
                beaten: null,
              }),
            }),
          ],
        }),
      },
      "/api/market/phase/calls": { body: [] },
      "/api/market/phase": { body: marketPhaseView() },
    });
    renderPage(<StartToday shown={null} />);
    const table = await screen.findByRole("table", { name: "Strategies for this phase" });
    await within(table).findByRole("link", { name: "Sparse" });

    for (const name of [
      /^Strategy/,
      /^Style/,
      /^Risk/,
      /^Lead over the basket/,
      /^Median return/,
      /^Worst episode/,
      /^Beat the basket/,
    ]) {
      await userEvent.click(within(table).getByRole("button", { name }));
    }

    const sparse = within(table).getByRole("link", { name: "Sparse" }).closest("tr");
    expect(sparse).not.toBeNull();
    expect(within(sparse as HTMLElement).getAllByText("-").length).toBeGreaterThanOrEqual(4);
    // The last always sorts after a figure: a lead it lacks ranks last.
    expect(names(table).at(-1)).toBe("Sparse");
    expect(screen.getByText(/^1 past episode\. Over/)).toHaveTextContent(
      "on the Nifty 500 and - on the liquid basket",
    );
  });
});
