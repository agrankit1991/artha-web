/** Tests for drawing on a price chart: placing, picking, dragging, keeping. */

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PriceChart } from "./PriceChart";
import { chartCalls, chartElement } from "@/test/chartStub";
import { chartPoints, renderPage, stubPlatform } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  window.localStorage.clear();
});

const KEY = "NSE_EQ|INE002A01018";

const SUPPORT = {
  drawing_id: 7,
  instrument_key: KEY,
  kind: "horizontal",
  points: [{ day: "2026-09-05", price: "120" }],
  label: null,
  colour: null,
  locked: false,
  drawn_on: "2026-11-08",
};

/** The platform, with the drawings it holds and the writes these tests make. */
function stub(held: unknown[] = []): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/drawings/7": {
      bodyFor: (_path, method) => (method === "DELETE" ? {} : { ...SUPPORT, locked: true }),
    },
    "/api/drawings": {
      bodyFor: (_path, method) =>
        method === "POST" ? { ...SUPPORT, drawing_id: 8 } : method === "DELETE" ? {} : held,
    },
  });
}

/** The requests made, as method and decoded path, spaces restored. */
function made(fetched: ReturnType<typeof stubPlatform>): string[] {
  return fetched.mock.calls.map(
    ([path, init]) => `${init?.method ?? "GET"} ${decodeURIComponent(path).replaceAll("+", " ")}`,
  );
}

/** The body of the last request to a path by a method. */
function sent(fetched: ReturnType<typeof stubPlatform>, method: string): Record<string, unknown> {
  const call = [...fetched.mock.calls].reverse().find(([, init]) => init?.method === method);
  return JSON.parse(call?.[1]?.body as string) as Record<string, unknown>;
}

/** Click on the chart at a spot, on a session, over a bar. */
function click(x: number, y: number, day: string, bar?: object): void {
  const handlers = chartCalls.subscribeClick.mock.calls.map(
    ([handler]) => handler as (event: unknown) => void,
  );
  const series = chartCalls.addSeries.mock.results[0]?.value as unknown;
  act(() => {
    handlers.at(-1)?.({
      point: { x, y },
      time: day,
      logical: Number(day.slice(8, 10)),
      seriesData: new Map(bar === undefined ? [] : [[series, bar]]),
    });
  });
}

/** Send a pointer event to the plot at a spot. */
function pointer(type: string, x: number, y: number): void {
  const event = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(event, "offsetX", { value: x });
  Object.defineProperty(event, "offsetY", { value: y });
  act(() => {
    chartElement.dispatchEvent(event);
  });
}

function draw(): void {
  renderPage(<PriceChart points={chartPoints(10)} drawingsOf={KEY} initialOverlays={[]} />);
}

describe("PriceChart, drawing", () => {
  it("offers the tools only where there is an instrument to draw on", () => {
    stub();
    renderPage(<PriceChart points={chartPoints(10)} initialOverlays={[]} />);
    expect(screen.queryByRole("toolbar", { name: "Drawing tools" })).toBeNull();
  });

  it("keeps a support line placed with one click, snapped to the session's nearest price", async () => {
    const fetched = stub();
    draw();
    await waitFor(() => {
      expect(chartCalls.attachPrimitive).toHaveBeenCalled();
    });

    await userEvent.click(screen.getByRole("button", { name: "Horizontal line" }));
    expect(screen.getByText(/Click 1 more point on the chart/)).toBeVisible();
    click(50, 108, "2026-09-05", { open: 100, high: 110, low: 95, close: 105 });

    await waitFor(() => {
      expect(made(fetched)).toContain("POST /api/drawings");
    });
    expect(sent(fetched, "POST")).toMatchObject({
      instrument_key: KEY,
      kind: "horizontal",
      points: [{ day: "2026-09-05", price: "110" }],
    });
    expect(screen.getByRole("button", { name: "Horizontal line" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("places a trend line's two points as it is told, without the magnet when it is off", async () => {
    const fetched = stub();
    draw();
    await userEvent.click(screen.getByRole("button", { name: /Magnet/ }));
    await userEvent.click(screen.getByRole("button", { name: "Trend line" }));

    click(20, 108, "2026-09-02", { open: 100, high: 110, low: 95, close: 105 });
    expect(screen.getByText(/Click 1 more point/)).toBeVisible();
    click(80, 60, "2026-09-08");

    await waitFor(() => {
      expect(made(fetched)).toContain("POST /api/drawings");
    });
    expect(sent(fetched, "POST")).toMatchObject({
      kind: "trend",
      points: [
        { day: "2026-09-02", price: "108" },
        { day: "2026-09-08", price: "60" },
      ],
    });
  });

  it("measures between two points without keeping anything", async () => {
    const fetched = stub();
    draw();
    await userEvent.click(screen.getByRole("button", { name: "Measure" }));
    click(20, 100, "2026-09-02");
    click(80, 115, "2026-09-08");

    expect(await screen.findByText("Measured: +15.00% (+15.00) over 6 sessions.")).toBeVisible();
    expect(made(fetched)).not.toContain("POST /api/drawings");
  });

  it("ignores clicks off the plot, and puts a tool down on Escape", async () => {
    const fetched = stub();
    draw();
    await userEvent.click(screen.getByRole("button", { name: "Vertical line" }));
    const handler = chartCalls.subscribeClick.mock.calls.at(-1)?.[0] as (event: unknown) => void;
    act(() => {
      handler({ point: undefined, time: undefined, seriesData: new Map() });
    });
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByText(/more point/)).toBeNull();
    expect(made(fetched)).not.toContain("POST /api/drawings");
  });

  it("picks a drawing, locks it, and deletes it by its button or the Delete key", async () => {
    const fetched = stub([SUPPORT]);
    draw();
    // Once they are read: the button that deletes them appears only then.
    await screen.findByRole("button", { name: "Delete every drawing" });
    expect(made(fetched)).toContain(`GET /api/drawings?instrument_key=${KEY}`);

    click(200, 121, "2026-09-05");
    const toolbar = await screen.findByRole("toolbar", { name: "Drawing tools" });
    expect(within(toolbar).getByText("Horizontal line picked:")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Lock the drawing" }));
    await waitFor(() => {
      expect(made(fetched)).toContain("PATCH /api/drawings/7");
    });
    expect(sent(fetched, "PATCH")).toMatchObject({ locked: true });

    await userEvent.click(screen.getByRole("button", { name: "Delete the drawing" }));
    await waitFor(() => {
      expect(made(fetched)).toContain("DELETE /api/drawings/7");
    });

    click(200, 121, "2026-09-05");
    await screen.findByText("Horizontal line picked:");
    fireEvent.keyDown(window, { key: "Delete" });
    await waitFor(() => {
      expect(made(fetched).filter((one) => one === "DELETE /api/drawings/7")).toHaveLength(2);
    });
  });

  it("drags a drawing picked, keeping it where it is let go, the chart held still meanwhile", async () => {
    const fetched = stub([SUPPORT]);
    draw();
    // Once they are read: the button that deletes them appears only then.
    await screen.findByRole("button", { name: "Delete every drawing" });
    expect(made(fetched)).toContain(`GET /api/drawings?instrument_key=${KEY}`);
    click(200, 120, "2026-09-05");
    await screen.findByText("Horizontal line picked:");

    pointer("pointerdown", 50, 120);
    expect(chartCalls.applyChartOptions).toHaveBeenLastCalledWith({
      handleScroll: false,
      handleScale: false,
    });
    pointer("pointermove", 70, 100);
    pointer("pointerup", 70, 100);

    expect(chartCalls.applyChartOptions).toHaveBeenLastCalledWith({
      handleScroll: true,
      handleScale: true,
    });
    await waitFor(() => {
      expect(made(fetched)).toContain("PATCH /api/drawings/7");
    });
    expect(sent(fetched, "PATCH")).toMatchObject({ points: [{ day: "2026-09-07", price: "100" }] });
  });

  it("does not drag what is not picked or is locked", async () => {
    const fetched = stub([{ ...SUPPORT, locked: true }]);
    draw();
    // Once they are read: the button that deletes them appears only then.
    await screen.findByRole("button", { name: "Delete every drawing" });
    expect(made(fetched)).toContain(`GET /api/drawings?instrument_key=${KEY}`);
    pointer("pointerdown", 50, 120);
    click(200, 120, "2026-09-05");
    await screen.findByText("Horizontal line picked:");
    pointer("pointerdown", 50, 120);
    pointer("pointermove", 70, 100);
    pointer("pointerup", 70, 100);

    expect(chartCalls.applyChartOptions).not.toHaveBeenCalledWith({
      handleScroll: false,
      handleScale: false,
    });
    expect(made(fetched)).not.toContain("PATCH /api/drawings/7");
  });

  it("hides the drawings and deletes them all after asking", async () => {
    const fetched = stub([SUPPORT]);
    draw();
    await screen.findByRole("button", { name: "Delete every drawing" });

    await userEvent.click(screen.getByRole("button", { name: "Hide drawings" }));
    expect(screen.getByRole("button", { name: "Show drawings" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete every drawing" }));
    const dialog = screen.getByRole("dialog", { name: "Delete every drawing on this chart?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete them" }));
    await waitFor(() => {
      expect(made(fetched)).toContain(`DELETE /api/drawings?instrument_key=${KEY}`);
    });
  });

  it("says when a drawing could not be kept", async () => {
    stubPlatform({
      "/api/drawings": {
        bodyFor: (_path, method) => (method === "POST" ? { detail: "full" } : []),
        statusFor: (_path, method) => (method === "POST" ? 409 : 200),
      },
    });
    draw();
    await userEvent.click(screen.getByRole("button", { name: "Horizontal line" }));
    click(50, 108, "2026-09-05");

    expect(await screen.findByText("full")).toBeVisible();
  });

  it("lets go of the chart when torn down", async () => {
    stub();
    const { unmount } = renderPage(
      <PriceChart points={chartPoints(10)} drawingsOf={KEY} initialOverlays={[]} />,
    );
    await waitFor(() => {
      expect(chartCalls.attachPrimitive).toHaveBeenCalled();
    });
    unmount();
    expect(chartCalls.detachPrimitive).toHaveBeenCalled();
    expect(chartCalls.unsubscribeClick).toHaveBeenCalled();
  });
});

describe("PriceChart, the drawing toolbar's words", () => {
  it("counts the points still wanted, and reads a fall over one session", async () => {
    stub();
    draw();
    await userEvent.click(screen.getByRole("button", { name: "Trend line" }));
    expect(screen.getByText(/Click 2 more points on the chart/)).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Measure" }));
    click(20, 115, "2026-09-02");
    click(30, 100, "2026-09-03");
    expect(await screen.findByText("Measured: -13.04% (-15.00) over 1 session.")).toBeVisible();
  });

  it("offers to unlock a locked drawing, and keeps every drawing when the reader thinks again", async () => {
    const fetched = stub([{ ...SUPPORT, locked: true }]);
    draw();
    await screen.findByRole("button", { name: "Delete every drawing" });
    click(200, 120, "2026-09-05");
    expect(await screen.findByRole("button", { name: "Unlock the drawing" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Delete every drawing" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(made(fetched)).not.toContain(`DELETE /api/drawings?instrument_key=${KEY}`);
  });
});

describe("PriceChart, the drawing tools' edges", () => {
  it("puts a tool down when it is chosen a second time", async () => {
    stub();
    draw();
    const trend = screen.getByRole("button", { name: "Trend line" });
    await userEvent.click(trend);
    expect(trend).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(trend);
    expect(trend).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText(/more points? on the chart/)).toBeNull();
  });

  it("leaves a drawing where it was when pressed away from it or let go past the last session", async () => {
    const fetched = stub([
      SUPPORT,
      { ...SUPPORT, drawing_id: 9, points: [{ day: "2026-09-05", price: "150" }] },
    ]);
    draw();
    await screen.findByRole("button", { name: "Delete every drawing" });
    click(200, 120, "2026-09-05");
    await screen.findByText("Horizontal line picked:");

    // Pressed off the line picked, the chart keeps its own dragging.
    pointer("pointerdown", 50, 160);
    expect(chartCalls.applyChartOptions).not.toHaveBeenCalledWith({
      handleScroll: false,
      handleScale: false,
    });
    pointer("pointerup", 50, 160);

    // Held and moved beside the other drawing, then let go off the sessions.
    pointer("pointerdown", 50, 120);
    pointer("pointermove", 70, 100);
    pointer("pointerup", 400, 100);
    expect(chartCalls.applyChartOptions).toHaveBeenLastCalledWith({
      handleScroll: true,
      handleScale: true,
    });
    expect(made(fetched).some((request) => request.startsWith("PATCH"))).toBe(false);
  });

  it("deletes the drawing picked with Backspace, and nothing on another key", async () => {
    const fetched = stub([SUPPORT]);
    draw();
    await screen.findByRole("button", { name: "Delete every drawing" });
    click(200, 120, "2026-09-05");
    await screen.findByText("Horizontal line picked:");

    await userEvent.keyboard("a");
    expect(made(fetched)).not.toContain("DELETE /api/drawings/7");
    await userEvent.keyboard("{Backspace}");
    await waitFor(() => {
      expect(made(fetched)).toContain("DELETE /api/drawings/7");
    });
  });
});
