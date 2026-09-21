/** Tests for the market breadth page. */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Breadth } from "./Breadth";
import { ThemeProvider } from "@/lib/theme";
import { breadth, breadthGrid, breadthSession, scopeOptions, stubPlatform } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubEverything(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/movers/scopes": { body: scopeOptions() },
    "/api/breadth/grid": { body: breadthGrid() },
    "/api/breadth": { body: breadth() },
  });
}

describe("Breadth", () => {
  it("shows every headline measure with what it means", async () => {
    stubEverything();

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    const measures = await screen.findByRole("region", { name: "Headline measures" });
    expect(within(measures).getByText("McClellan oscillator")).toBeInTheDocument();
    expect(within(measures).getByText("Breadth thrust")).toBeInTheDocument();
    expect(within(measures).getByText("Arms index (TRIN)")).toBeInTheDocument();
    expect(within(measures).getByText("More stocks joining")).toBeInTheDocument();
  });

  it("lists every counted session, most recent first", async () => {
    // The depth a glance on the overview cannot hold.
    stubEverything();

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    await screen.findByText("Session by session");
    const history = screen.getByRole("region", { name: "Session history" });
    const [, firstRow] = within(history).getAllByRole("row");
    expect(within(firstRow as HTMLElement).getByText(/^18 Sept? 2026$/)).toBeInTheDocument();
  });

  it("re-counts for whichever population is chosen", async () => {
    const fetchMock = stubEverything();
    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );
    await screen.findByText("Session by session");

    await userEvent.click(screen.getByRole("button", { name: "Nifty 50" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some((path) => path.includes("/api/breadth") && path.includes("scope_kind=index")),
      ).toBe(true);
    });
  });

  it("asks for a longer run when a longer window is chosen", async () => {
    const fetchMock = stubEverything();
    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );
    await screen.findByText("Session by session");

    await userEvent.click(screen.getByRole("button", { name: "5Y" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("sessions=1250"))).toBe(true);
    });
  });

  it("asks for a year to begin with", async () => {
    const fetchMock = stubEverything();

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("sessions=250"))).toBe(true);
    });
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/breadth/grid": { body: breadthGrid() },
      "/api/breadth": { status: 500, body: { detail: "the counts are being rebuilt" } },
    });

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("the counts are being rebuilt");
  });

  it("says a population has no sessions rather than showing a blank table", async () => {
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/breadth/grid": { body: breadthGrid() },
      "/api/breadth": { body: breadth({ sessions: [], latest: null }) },
    });

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    expect(await screen.findByText("No sessions counted for this population")).toBeInTheDocument();
  });

  it("sorts the history by any column, not only by date", async () => {
    // Asked of this table: which session had the most new lows, which had
    // the highest TRIN. Neither is answerable by reading down a date, so
    // every column here is sortable rather than decorative.
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/breadth/grid": { body: breadthGrid() },
      "/api/breadth": {
        body: breadth({
          sessions: [
            breadthSession({ as_of: "2026-09-16", advancing: 10, new_lows: 90 }),
            breadthSession({ as_of: "2026-09-17", advancing: 80, new_lows: 2 }),
          ],
        }),
      },
    });
    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );
    await screen.findByText("Session by session");
    const table = within(screen.getByRole("region", { name: "Session history" })).getByRole(
      "table",
    );
    const headers = within(table).getAllByRole("button");

    for (const header of headers) {
      await userEvent.click(header);
    }

    // A numeric column sorts widest-first, so the last column clicked --
    // the advance-decline line -- puts its larger value at the top.
    const [, firstRow] = within(table).getAllByRole("row");
    expect(within(firstRow as HTMLElement).getByText(/Sept 2026/)).toBeInTheDocument();
    expect(headers.length).toBeGreaterThan(5);
  });

  it("sorts a column where some sessions have no figure at all", async () => {
    // A session where nothing traded has no ratio and no TRIN, and a
    // nought there would read as a real observation of nought. Sorting on
    // such a column must still order the sessions that do have one.
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/breadth/grid": { body: breadthGrid() },
      "/api/breadth": {
        body: breadth({
          sessions: [
            breadthSession({
              as_of: "2026-09-16",
              advance_decline_ratio: null,
              arms_index: null,
              above_sma_200: null,
            }),
            breadthSession({ as_of: "2026-09-17" }),
          ],
        }),
      },
    });

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );
    await screen.findByText("Session by session");
    const table = within(screen.getByRole("region", { name: "Session history" })).getByRole(
      "table",
    );

    for (const header of within(table).getAllByRole("button")) {
      await userEvent.click(header);
    }

    // The session with no ratio, no TRIN and no share above the 200-day
    // shows three dashes wherever the sort has put it.
    expect(within(table).getAllByText("—")).toHaveLength(3);
  });

  it("names the regime rather than leaving a share to be interpreted", async () => {
    stubEverything();

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    expect(await screen.findByText("Risk-on")).toBeInTheDocument();
  });

  it("places each share in the population's own history", async () => {
    // 62% above the 200-day is weak or ordinary depending on the
    // population, and the figure alone cannot say which.
    stubEverything();

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    // Printed twice on purpose: once as the headline regime and once
    // under the meter the share belongs to.
    expect(await screen.findAllByText(/Higher than 71% of its own history/)).toHaveLength(2);
  });

  it("lays every sector out, strongest first", async () => {
    stubEverything();

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    expect(await screen.findByText("Where the market is working")).toBeInTheDocument();
    expect(screen.getByText("IT - Software")).toBeInTheDocument();
    expect(screen.getByText("Pharmaceuticals")).toBeInTheDocument();
  });

  it("lays the indices out on the same question", async () => {
    const fetchMock = stubEverything();
    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );
    await screen.findByText("Where the market is working");

    // "Indices" names both a whole population to count and a kind to lay
    // out, so the query has to say which control it means.
    const chooser = screen.getByRole("group", { name: "Grid population" });
    await userEvent.click(within(chooser).getByRole("button", { name: "Indices" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some(
          (path) => path.includes("/api/breadth/grid") && path.includes("scope_kind=index"),
        ),
      ).toBe(true);
    });
  });

  it("counts a population chosen from the grid", async () => {
    // The grid says which sector is working; the next question is always
    // that sector's own breadth.
    const fetchMock = stubEverything();
    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );
    await screen.findByText("Where the market is working");

    await userEvent.click(screen.getByText("Pharmaceuticals"));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some(
          (path) => path.includes("/api/breadth?") && path.includes("scope_key=Pharmaceuticals"),
        ),
      ).toBe(true);
    });
  });

  it("draws the participation measures against their dates", async () => {
    // A cumulative line is read for its direction and an oscillator for
    // where it crosses nought; neither is readable without the dates.
    stubEverything();

    render(
      <ThemeProvider>
        <Breadth />
      </ThemeProvider>,
    );

    // Named in two places on this page -- as a column of the history and
    // as a line on this chart -- so the chart is asked for by its own region.
    await screen.findByText("Session by session");
    const drawn = screen.getByRole("region", { name: "Participation over time" });
    expect(within(drawn).getByText("Net advancing")).toBeInTheDocument();
    expect(within(drawn).getByText("McClellan oscillator")).toBeInTheDocument();
  });
});
