/** Tests for one strategy's page: writing, saving, running and deleting it. */

import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  backtestDetail,
  renderPage,
  strategyDetail,
  strategyRequest,
  strategySummary,
  stubPlatform,
} from "@/test/support";
import type { Reply } from "@/test/support";

import { POLL, Strategy } from "./Strategy";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** What every page of this kind asks for besides the strategy itself. */
const QUIET: Record<string, Reply> = {
  "/api/strategies/check": {
    body: { valid: true, message: null, name: "Checked", combines: false, plays: [] },
  },
  "/api/strategies/language": { body: { series: ["close"], functions: ["sma"] } },
  "/api/backtests/7": { body: backtestDetail() },
};

/** Draw the page at an address, with the list page it may go back to. */
function draw(at: string): void {
  renderPage(
    <Routes>
      <Route path="/strategy/:id" element={<Strategy />} />
      <Route path="/strategies" element={<p>The list</p>} />
    </Routes>,
    { at },
  );
}

/** The calls made with a method, as [path, body]. */
function sent(platform: ReturnType<typeof stubPlatform>, method: string): [string, unknown][] {
  return platform.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === method)
    .map(([path, init]) => {
      const body = (init as RequestInit).body;
      return [path as string, typeof body === "string" ? JSON.parse(body) : undefined];
    });
}

describe("a new strategy", () => {
  it("starts from a template, and goes to its page once saved", async () => {
    const platform = stubPlatform({
      ...QUIET,
      "/api/strategies": {
        bodyFor: (_path, method) =>
          method === "POST"
            ? strategyDetail({ strategy_id: 9, name: "My momentum" })
            : [strategySummary()],
      },
      "/api/strategies/9": { body: strategyDetail({ strategy_id: 9, name: "My momentum" }) },
    });
    draw("/strategy/new");
    const editor = screen.getByRole("textbox", { name: "Strategy text" });
    expect((editor as HTMLTextAreaElement).value).toContain('name = "My momentum"');

    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    expect(await screen.findByRole("heading", { name: "My momentum" })).toBeInTheDocument();
    const [[path, body]] = sent(platform, "POST").filter(([p]) => p === "/api/strategies") as [
      [string, { text: string }],
    ];
    expect(path).toBe("/api/strategies");
    expect(body.text).toContain('name = "My momentum"');
  });

  it("offers a combination of the strategies already saved", async () => {
    stubPlatform({ ...QUIET, "/api/strategies": { body: [strategySummary()] } });
    draw("/strategy/new");
    const editor = screen.getByRole("textbox", { name: "Strategy text" });
    await screen.findByRole("status");

    await userEvent.click(screen.getByRole("button", { name: "Start from a combination" }));
    expect((editor as HTMLTextAreaElement).value).toContain('strategy = "Momentum near the high"');

    await userEvent.click(screen.getByRole("button", { name: "Start from a strategy" }));
    expect((editor as HTMLTextAreaElement).value).toContain('name = "My momentum"');
  });

  it("says why it was not saved", async () => {
    stubPlatform({
      ...QUIET,
      "/api/strategies": {
        bodyFor: (_path, method) =>
          method === "POST" ? { detail: "a strategy called 'My momentum' already exists" } : [],
        statusFor: (_path, method) => (method === "POST" ? 409 : 200),
      },
    });
    draw("/strategy/new");

    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  });
});

describe("a saved strategy", () => {
  it("shows its verdict, the companies it would hold today, and its runs", async () => {
    stubPlatform({ ...QUIET, "/api/strategies/5": { body: strategyDetail() } });
    draw("/strategy/5");

    expect(await screen.findByRole("heading", { name: "Momentum near the high" })).toBeVisible();
    expect(screen.getByText("+12.9 pp")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "CLIMBER" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Backtest runs" })).toBeInTheDocument();
    expect(screen.getByText("As saved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save$/ })).toBeDisabled();
  });

  it("marks a combination as one", async () => {
    stubPlatform({ ...QUIET, "/api/strategies/5": { body: strategyDetail({ combines: true }) } });
    draw("/strategy/5");

    expect(await screen.findByText("Combination")).toBeInTheDocument();
  });

  it("saves edited rules", async () => {
    const platform = stubPlatform({
      ...QUIET,
      "/api/strategies/5": { body: strategyDetail() },
    });
    draw("/strategy/5");
    const editor = await screen.findByRole("textbox", { name: "Strategy text" });

    await userEvent.type(editor, "# note");
    expect(screen.getByText("Unsaved changes.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Save$/ }));

    const puts = sent(platform, "PUT") as [string, { text: string }][];
    expect(puts).toHaveLength(1);
    expect(puts[0]?.[1].text).toMatch(/# note$/);
  });

  it("runs a backtest of the rules as saved", async () => {
    const platform = stubPlatform({
      ...QUIET,
      "/api/strategies/5": { body: strategyDetail() },
      "/api/strategies/5/backtests": { status: 202, body: strategyRequest({ status: "queued" }) },
    });
    draw("/strategy/5");

    await userEvent.click(await screen.findByRole("button", { name: /Run backtest/ }));

    expect(sent(platform, "POST").map(([path]) => path)).toContain("/api/strategies/5/backtests");
    expect(sent(platform, "PUT")).toHaveLength(0);
  });

  it("saves unsaved rules before running them", async () => {
    const platform = stubPlatform({
      ...QUIET,
      "/api/strategies/5": { body: strategyDetail() },
      "/api/strategies/5/backtests": { status: 202, body: strategyRequest({ status: "queued" }) },
    });
    draw("/strategy/5");
    await userEvent.type(await screen.findByRole("textbox", { name: "Strategy text" }), "#");

    await userEvent.click(screen.getByRole("button", { name: /Save and run/ }));

    expect(sent(platform, "PUT")).toHaveLength(1);
    expect(sent(platform, "POST").map(([path]) => path)).toContain("/api/strategies/5/backtests");
  });

  it("says why a run was refused", async () => {
    stubPlatform({
      ...QUIET,
      "/api/strategies/5": { body: strategyDetail() },
      "/api/strategies/5/backtests": {
        status: 422,
        body: { detail: "no saved strategy is called 'Gone'" },
      },
    });
    draw("/strategy/5");

    await userEvent.click(await screen.findByRole("button", { name: /Run backtest/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("no saved strategy is called");
  });

  it("asks after a queued backtest until it is done", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let asked = 0;
    stubPlatform({
      ...QUIET,
      "/api/strategies/5": {
        bodyFor: () => {
          asked += 1;
          return asked === 1
            ? strategyDetail({
                latest: strategyRequest({ status: "queued", started_at: null, finished_at: null }),
                result: null,
                requests: [],
              })
            : strategyDetail();
        },
      },
    });
    draw("/strategy/5");

    expect(await screen.findByText(/Queued/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run backtest/ })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL);
    });

    expect(await screen.findByText("Latest backtest")).toBeInTheDocument();
    expect(screen.queryByText(/Queued/)).not.toBeInTheDocument();
  });

  it("says a backtest is running", async () => {
    stubPlatform({
      ...QUIET,
      "/api/strategies/5": {
        body: strategyDetail({
          latest: strategyRequest({ status: "running", finished_at: null }),
        }),
      },
    });
    draw("/strategy/5");

    expect(await screen.findByText(/Running since/)).toBeInTheDocument();
  });

  it("says why the last run failed", async () => {
    stubPlatform({
      ...QUIET,
      "/api/strategies/5": {
        body: strategyDetail({
          latest: strategyRequest({ status: "failed", error: "rank: no series named 'closes'" }),
          result: null,
        }),
      },
    });
    draw("/strategy/5");

    expect(await screen.findByRole("alert")).toHaveTextContent("The last run failed");
    expect(screen.getAllByText("Not backtested yet").length).toBeGreaterThan(0);
  });

  it("is deleted once confirmed, and goes back to the list", async () => {
    const platform = stubPlatform({ ...QUIET, "/api/strategies/5": { body: strategyDetail() } });
    draw("/strategy/5");

    await userEvent.click(await screen.findByRole("button", { name: "Delete strategy" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("The list")).toBeInTheDocument();
    expect(sent(platform, "DELETE").map(([path]) => path)).toEqual(["/api/strategies/5"]);
  });

  it("closes the question without deleting", async () => {
    const platform = stubPlatform({ ...QUIET, "/api/strategies/5": { body: strategyDetail() } });
    draw("/strategy/5");

    await userEvent.click(await screen.findByRole("button", { name: "Delete strategy" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sent(platform, "DELETE")).toHaveLength(0);
  });

  it("says when there is no such strategy", async () => {
    stubPlatform({ ...QUIET, "/api/strategies/5": { status: 404, body: { detail: "no" } } });
    draw("/strategy/5");

    expect(await screen.findByText("No strategy 5")).toBeInTheDocument();
  });

  it("says so when it cannot be read", async () => {
    stubPlatform({ ...QUIET, "/api/strategies/5": { status: 500, body: { detail: "broke" } } });
    draw("/strategy/5");

    expect(await screen.findByRole("alert")).toHaveTextContent("broke");
  });
});
