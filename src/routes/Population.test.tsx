/** Tests for one index or sector's own page. */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Population } from "./Population";
import { ThemeProvider } from "@/lib/theme";
import { breadth, chartPoints, member, population, stubPlatform } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(
  body: ReturnType<typeof population> = population(),
): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/populations": { body },
    "/api/breadth": { body: breadth() },
    "/api/figures": { body: { instrument_key: body.instrument_key, points: chartPoints(30) } },
  });
}

function show(kind: "index" | "sector" = "index", key = "NSE_INDEX|Nifty Bank"): void {
  render(
    <ThemeProvider>
      <Population kind={kind} scopeKey={key} />
    </ThemeProvider>,
  );
}

describe("Population", () => {
  it("says what the index is, as its exchange describes it", async () => {
    stubEverything();

    show();

    expect(await screen.findByRole("heading", { name: "Nifty Bank" })).toBeInTheDocument();
    expect(screen.getByText(/most liquid and large capitalised/)).toBeInTheDocument();
    expect(screen.getByText("Sectoral")).toBeInTheDocument();
  });

  it("says how it is doing against the market", async () => {
    // The reason the page exists: a return on its own says almost nothing.
    stubEverything();

    show();

    expect(await screen.findByText("Relative strength")).toBeInTheDocument();
    expect(screen.getByText("Whole market")).toBeInTheDocument();
  });

  it("counts how many companies it holds", async () => {
    stubEverything();

    show();

    expect(await screen.findByText("2 companies")).toBeInTheDocument();
  });

  it("draws the index's own price, because an index trades", async () => {
    stubEverything();

    show();

    expect(await screen.findByRole("heading", { name: "Price" })).toBeInTheDocument();
  });

  it("draws no price for a sector, because a sector does not trade", async () => {
    // It is a grouping rather than a thing that trades.
    stubEverything(
      population({ scope_kind: "sector", name: "IT - Software", instrument_key: null }),
    );

    show("sector", "IT - Software");

    await screen.findByRole("heading", { name: "IT - Software" });
    expect(screen.queryByRole("heading", { name: "Price" })).not.toBeInTheDocument();
  });

  it("counts the population's breadth for its own scope", async () => {
    const fetchMock = stubEverything();

    show("sector", "IT - Software");

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some((path) => path.includes("/api/breadth") && path.includes("scope_kind=sector")),
      ).toBe(true);
    });
  });

  it("colours every company by how it moved", async () => {
    stubEverything();

    show();

    expect(await screen.findByText("How the day went")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Companies by move" })).toBeInTheDocument();
  });

  it("lists the companies it holds, sortable by every column", async () => {
    stubEverything();

    show();

    await screen.findByText("Constituents");
    const table = screen.getByRole("table", { name: "Constituents" });
    const headers = within(table).getAllByRole("button");

    for (const header of headers) {
      await userEvent.click(header);
    }

    // Price, change, distance from the high, volume: each is a question
    // somebody asks of a constituent list, so each sorts.
    expect(headers.length).toBeGreaterThan(4);
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("sorts a column where a company has no figures at all", async () => {
    // A company in an index whose figures have not been rebuilt since its
    // bars arrived is still in the index, so it is listed without them.
    stubEverything(
      population({
        members: [
          member(),
          member({
            instrument_key: "NSE_EQ|INE467B01029",
            symbol: "TCS",
            close: null,
            change_percent: null,
            volume: null,
            from_high_percent: null,
            as_of: null,
          }),
        ],
      }),
    );
    show();
    await screen.findByText("Constituents");
    const table = screen.getByRole("table", { name: "Constituents" });

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    expect(within(table).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("asks for more history when a longer range is chosen", async () => {
    const fetchMock = stubEverything();
    show();
    await screen.findByRole("heading", { name: "Price" });

    await userEvent.click(
      within(screen.getByRole("group", { name: "History" })).getByRole("button", { name: "5Y" }),
    );

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("sessions=1250"))).toBe(true);
    });
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({
      "/api/populations": { status: 404, body: { detail: "no index called that" } },
      "/api/breadth": { body: breadth() },
    });

    show();

    expect(await screen.findByRole("alert")).toHaveTextContent("no index called that");
  });

  it("shows a population with no companies recorded without falling over", async () => {
    stubEverything(population({ members: [], performance: null }));

    show();

    await screen.findByRole("heading", { name: "Nifty Bank" });
    expect(screen.queryByText("Constituents")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing to compare yet")).toBeInTheDocument();
  });
});
