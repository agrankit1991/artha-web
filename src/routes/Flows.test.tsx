/** Tests for the FII / DII page. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { InstitutionalFlow } from "@/api/client";
import { overview, renderPage, stubPlatform } from "@/test/support";

import { Flows } from "./Flows";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** One flow row, cash unless said otherwise. */
function flow(overrides: Partial<InstitutionalFlow>): InstitutionalFlow {
  return {
    participant: "FII",
    segment: "CASH",
    period: "DAY",
    day: "2026-09-22",
    buy_amount: "9845.81",
    sell_amount: "13655.80",
    net_amount: "-3809.99",
    buy_contracts: null,
    sell_contracts: null,
    oi_contracts: null,
    oi_amount: null,
    long_contracts: null,
    short_contracts: null,
    ...overrides,
  };
}

const ROWS: InstitutionalFlow[] = [
  flow({}),
  flow({
    participant: "DII",
    buy_amount: "14599.72",
    sell_amount: "10479.65",
    net_amount: "4120.07",
  }),
  flow({ day: "2026-09-21", net_amount: "1000.00" }),
  flow({ participant: "DII", day: "2026-09-21", net_amount: "-500.00" }),
  flow({
    segment: "INDEX_FUTURES",
    buy_amount: "3621.17",
    sell_amount: "5524.35",
    net_amount: "-1903.18",
    buy_contracts: 23077,
    sell_contracts: 35439,
    oi_contracts: 383422,
    oi_amount: "59925.26",
    long_contracts: 40257,
    short_contracts: 343165,
  }),
  // A segment reported without positions: no share can be worked out.
  flow({
    segment: "STOCK_FUTURES",
    net_amount: "12.00",
    long_contracts: null,
    short_contracts: null,
  }),
];

function stub(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/flows": {
      bodyFor: (path: string) =>
        path.includes("period=MONTH")
          ? [flow({ period: "MONTH", day: "2026-09-01", net_amount: "-25000.00" })]
          : ROWS,
    },
    "/api/overviews/history": {
      body: [overview({ as_of: "2026-09-22" })],
    },
  });
}

describe("Flows", () => {
  it("sets each session's cash flows beside the benchmark's move", async () => {
    stub();
    renderPage(<Flows />);

    const table = await screen.findByRole("table", { name: "Cash market flows" });
    const latest = (await within(table).findByText(/22 Sept? 2026/)).closest("tr");
    expect(latest).toHaveTextContent("9,845.81");
    expect(latest).toHaveTextContent("-3,809.99");
    expect(latest).toHaveTextContent("+4,120.07");
    expect(latest).toHaveTextContent("24,812.40");
    expect(within(table).getByRole("button", { name: /^Nifty 50 %/ })).toBeInTheDocument();
    // Five sessions summed, of which two are recorded here.
    expect(screen.getByText("FII net, last 2 sessions")).toBeInTheDocument();
    expect(screen.getByText("-2,809.99")).toHaveClass("text-loss");
    expect(screen.getByRole("img", { name: "FII net buying by session" })).toBeInTheDocument();
  });

  it("reads months without the benchmark, which is matched only to sessions", async () => {
    stub();
    renderPage(<Flows />);
    await screen.findByRole("table", { name: "Cash market flows" });

    await userEvent.click(screen.getByRole("button", { name: "Monthly" }));

    const table = await screen.findByRole("table", { name: "Cash market flows" });
    expect(await within(table).findByText("-25,000.00")).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: /^Month/ })).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: /^Nifty 50/ })).not.toBeInTheDocument();
  });

  it("shows foreign derivatives positioning with the share held long", async () => {
    stub();
    renderPage(<Flows />);
    await screen.findByRole("table", { name: "Cash market flows" });

    await userEvent.click(screen.getByRole("tab", { name: "FII derivatives" }));

    const table = screen.getByRole("table", { name: "FII derivatives flows" });
    expect(within(table).getByText("40,257")).toBeInTheDocument();
    expect(within(table).getByText("3,43,165")).toBeInTheDocument();
    // 40,257 of 3,83,422 contracts long.
    expect(within(table).getByText("10.50%")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Stock futures" }));
    const futures = screen.getByRole("table", { name: "FII derivatives flows" });
    expect(within(futures).getByText("+12.00").closest("tr")).toHaveTextContent("—");

    await userEvent.click(screen.getByRole("button", { name: "Stock options" }));
    expect(
      within(screen.getByRole("table", { name: "FII derivatives flows" })).getByText(
        "No derivatives flows recorded yet",
      ),
    ).toBeInTheDocument();
  });

  it("says so when the flows cannot be read", async () => {
    stubPlatform({ "/api/flows": { status: 500, body: { detail: "flows broke" } } });
    renderPage(<Flows />);

    expect(await screen.findByRole("alert")).toHaveTextContent("flows broke");
  });

  it("sorts both tables by any column", async () => {
    stub();
    renderPage(<Flows />);
    const cash = await screen.findByRole("table", { name: "Cash market flows" });
    await within(cash).findByText(/22 Sept? 2026/);

    for (const name of [
      /^Session/,
      /^FII buy/,
      /^FII sell/,
      /^FII net/,
      /^DII buy/,
      /^DII sell/,
      /^DII net/,
      /^Nifty 50 %/,
      /^Nifty 50$/,
    ]) {
      await userEvent.click(within(cash).getByRole("button", { name }));
    }
    expect(within(cash).getAllByRole("row")).toHaveLength(3);

    await userEvent.click(screen.getByRole("tab", { name: "FII derivatives" }));
    const derivatives = screen.getByRole("table", { name: "FII derivatives flows" });
    for (const name of [
      /^Date/,
      /^Buy/,
      /^Sell/,
      /^Net/,
      /^Long$/,
      /^Short/,
      /^Long %/,
      /^Open interest/,
      /^OI/,
    ]) {
      await userEvent.click(within(derivatives).getByRole("button", { name }));
    }
    expect(within(derivatives).getAllByRole("row")).toHaveLength(2);
  });

  it("waits for a first session rather than inventing one", async () => {
    stubPlatform({ "/api/flows": { body: [] }, "/api/overviews/history": { body: [] } });
    renderPage(<Flows />);

    const table = await screen.findByRole("table", { name: "Cash market flows" });
    expect(await within(table).findByText("No flows recorded yet")).toBeInTheDocument();
    expect(screen.getByText("FII net, latest session").parentElement).toHaveTextContent("—");
    expect(screen.queryByRole("img", { name: /net buying/ })).not.toBeInTheDocument();
  });
});
