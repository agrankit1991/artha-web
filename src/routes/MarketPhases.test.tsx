/** Tests for the Market phase page: the reading, the checklist and call, the journal, the history. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { marketPhaseView, phaseCall, renderPage, stubPlatform } from "@/test/support";

import { MarketPhases } from "./MarketPhases";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MarketPhases", () => {
  it("reads today's phase, links to the strategies for the reader's call and lists the journal", async () => {
    const fetched = stubPlatform({
      "/api/market/phase/calls": {
        bodyFor: (_path, method) => (method === "DELETE" ? {} : [phaseCall()]),
        statusFor: (_path, method) => (method === "DELETE" ? 204 : 200),
      },
      "/api/market/phase": { body: marketPhaseView() },
    });
    renderPage(<MarketPhases />);

    expect(await screen.findByText("The data reads, on 16 Oct 2026")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Today" })).getByText("Falling"),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", {
        name: "Which strategy did best when started in Bottoming",
      }),
    ).toHaveAttribute("href", "/strategies?phase=bottoming");
    const journal = screen.getByRole("table", { name: "Your calls" });
    expect(await within(journal).findByText("breadth turning, bottom in")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Signals" })).toBeInTheDocument();
    expect(screen.getAllByTestId("phase-band").length).toBeGreaterThan(0);
    expect(screen.getAllByText("The exact rule")).toHaveLength(2);
    expect(screen.getByText('when = "market_falling"')).toBeInTheDocument();

    await userEvent.click(
      within(journal).getByRole("button", { name: /Delete the call of 16 Oct/ }),
    );

    await waitFor(() => {
      expect(
        fetched.mock.calls.some(
          ([path, init]) => path === "/api/market/phase/calls/1" && init?.method === "DELETE",
        ),
      ).toBe(true);
    });
  });

  it("says when no phase is read yet", async () => {
    stubPlatform({
      "/api/market/phase/calls": { body: [] },
      "/api/market/phase": { body: marketPhaseView({ reading: null, signals: [], spells: [] }) },
    });
    renderPage(<MarketPhases />);

    expect(await screen.findByText(/No phase is read yet/)).toBeInTheDocument();
    expect(screen.getByText("No call recorded yet")).toBeInTheDocument();
  });

  it("says so when the phase cannot be read", async () => {
    stubPlatform({
      "/api/market/phase/calls": { body: [] },
      "/api/market/phase": { status: 500, body: { detail: "phase broke" } },
    });
    renderPage(<MarketPhases />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Phase broke");
  });
});

describe("MarketPhases' journal", () => {
  it("sorts by every column and marks a call without a note or a reading", async () => {
    stubPlatform({
      "/api/market/phase/calls": {
        body: [
          phaseCall(),
          phaseCall({ call_id: 2, as_of: "2026-10-15", note: "", data_phase: null }),
        ],
      },
      "/api/market/phase": { body: marketPhaseView() },
    });
    renderPage(<MarketPhases />);
    const journal = await screen.findByRole("table", { name: "Your calls" });
    await within(journal).findByText("breadth turning, bottom in");

    for (const name of [/^Session/, /^Your call/, /^The data read/, /^Why/, /^Recorded/]) {
      await userEvent.click(within(journal).getByRole("button", { name }));
    }

    expect(within(journal).getByText("Between phases")).toBeInTheDocument();
    expect(within(journal).getAllByText("-").length).toBeGreaterThanOrEqual(1);
  });
});
