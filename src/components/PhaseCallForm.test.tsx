/** Tests for the checklist and the reader's own call. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { marketPhaseView, phaseCall, renderPage, stubPlatform } from "@/test/support";

import { PhaseCallForm } from "./PhaseCallForm";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PhaseCallForm", () => {
  it("reads each signal, takes an override and records the call with the verdicts as judged", async () => {
    const fetched = stubPlatform({ "/api/market/phase/calls": { body: phaseCall() } });
    const recorded = vi.fn();
    renderPage(
      <PhaseCallForm view={marketPhaseView()} lastCall="bottoming" onRecorded={recorded} />,
    );

    const signals = screen.getByRole("list", { name: "Signals" });
    expect(within(signals).getByText("-3.2% from its 200-day average")).toBeInTheDocument();
    expect(within(signals).getByText("41%, -8 points in a month")).toBeInTheDocument();
    expect(within(signals).getByText("-Rs 3,810 crore over 10 sessions")).toBeInTheDocument();
    expect(screen.getByText("As you judge them: 1 up, 1 neutral, 4 down.")).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole("group", { name: "Your view of Breadth, 50-day" })).getByRole(
        "button",
        { name: "Up" },
      ),
    );
    expect(screen.getByText("Read Neutral")).toBeInTheDocument();
    expect(screen.getByText("As you judge them: 2 up, 0 neutral, 4 down.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Your call of the phase" })).getByRole("button", {
        name: "Bottoming",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.type(screen.getByRole("textbox", { name: "Why" }), "turning");
    await userEvent.click(screen.getByRole("button", { name: "Record my call" }));

    await waitFor(() => {
      expect(recorded).toHaveBeenCalledTimes(1);
    });
    const [, init] = fetched.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      phase: "bottoming",
      note: "turning",
      verdicts: {
        trend: "down",
        breadth: "down",
        short_breadth: "up",
        highs_lows: "down",
        vix: "up",
        flows: "down",
      },
    });
    expect(screen.getByRole("textbox", { name: "Why" })).toHaveValue("");
  });

  it("starts from the data's reading before any call, and says why a call was not kept", async () => {
    stubPlatform({
      "/api/market/phase/calls": { status: 500, body: { detail: "journal is full" } },
    });
    renderPage(<PhaseCallForm view={marketPhaseView()} lastCall={null} onRecorded={vi.fn()} />);

    expect(
      within(screen.getByRole("group", { name: "Your call of the phase" })).getByRole("button", {
        name: "Falling",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Record my call" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Journal is full");
  });

  it("leaves out the checklist without a reading", () => {
    renderPage(
      <PhaseCallForm
        view={marketPhaseView({ reading: null, signals: [] })}
        lastCall={null}
        onRecorded={vi.fn()}
      />,
    );

    expect(screen.queryByRole("list", { name: "Signals" })).toBeNull();
    expect(
      within(screen.getByRole("group", { name: "Your call of the phase" })).getByRole("button", {
        name: "Bottoming",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
