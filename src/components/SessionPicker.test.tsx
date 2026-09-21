/** Tests for the session picker. */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { nearestSession, SessionPicker } from "./SessionPicker";
import { renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

const SESSIONS = [
  { day: "2026-09-18", instruments: 5000 },
  { day: "2026-09-17", instruments: 5000 },
  { day: "2026-09-15", instruments: 5000 },
];

describe("SessionPicker", () => {
  it("bounds the box to the sessions held and moves a non-session to the last one before it", async () => {
    const onChange = vi.fn();
    stubPlatform({ "/api/sessions": { body: SESSIONS } });
    renderPage(<SessionPicker asOf={null} onChange={onChange} />);

    const box = await screen.findByLabelText("As of");
    expect(box).toHaveAttribute("max", "2026-09-18");
    expect(box).toHaveAttribute("min", "2026-09-15");
    // The 16th was no session; the 15th was.
    await userEvent.type(box, "2026-09-16");
    expect(onChange).toHaveBeenLastCalledWith("2026-09-15");
  });

  it("says which day it is read as of, and goes back to today", async () => {
    const onChange = vi.fn();
    stubPlatform({ "/api/sessions": { body: SESSIONS } });
    renderPage(<SessionPicker asOf="2026-09-15" onChange={onChange} />);

    expect(await screen.findByText(/Read as it stood on/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back to today" }));
    expect(onChange).toHaveBeenCalledWith(null);
    await userEvent.clear(screen.getByLabelText("As of"));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("says when the sessions cannot be read, and still takes a date", async () => {
    const onChange = vi.fn();
    stubPlatform({ "/api/sessions": { status: 500, body: { detail: "sessions broke" } } });
    renderPage(<SessionPicker asOf={null} onChange={onChange} />);

    expect(await screen.findByText(/sessions broke/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("As of"), "2026-09-16");
    expect(onChange).toHaveBeenLastCalledWith("2026-09-16");
  });
});

describe("nearestSession", () => {
  it("finds the last session on or before a date, or the oldest for a date before all", () => {
    expect(nearestSession("2026-09-17", SESSIONS)).toBe("2026-09-17");
    expect(nearestSession("2026-09-16", SESSIONS)).toBe("2026-09-15");
    expect(nearestSession("2026-01-01", SESSIONS)).toBe("2026-09-15");
    expect(nearestSession("2026-09-16", [])).toBe("2026-09-16");
  });
});
