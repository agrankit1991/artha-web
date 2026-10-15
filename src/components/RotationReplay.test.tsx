/** Tests for the rotation replayed over time. */

import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPage, sectorRotation } from "@/test/support";

import { RotationReplay } from "./RotationReplay";

afterEach(() => {
  vi.useRealTimers();
});

/** The quarter beneath the plot holding a name, read as its list's text. */
function quarter(name: string): HTMLElement {
  const found = screen.getByText(name, { selector: "dt span" }).closest("div");
  if (found === null) {
    throw new Error(`no ${name} quarter`);
  }
  return found;
}

function replay(): HTMLElement {
  renderPage(<RotationReplay rotation={sectorRotation()} plottedFrom={10} label="Sectors" />);
  return screen.getByRole("slider", { name: "Session" });
}

describe("RotationReplay", () => {
  it("opens on the latest session, named", () => {
    const slider = replay();

    expect(slider).toHaveValue("2");
    expect(slider.getAttribute("aria-valuetext")).toMatch(/18 Sept? 2026/);
    // Banks slipped into weakening; software climbed into leading.
    expect(quarter("Weakening")).toHaveTextContent("Banks");
    expect(quarter("Leading")).toHaveTextContent("IT - Software");
    // Too thin to plot on any session.
    expect(
      within(screen.getByRole("group", { name: "Sectors" })).getAllByRole("link"),
    ).toHaveLength(2);
  });

  it("moves every sector to where it stood on the session slid to", () => {
    const slider = replay();

    fireEvent.change(slider, { target: { value: "0" } });

    expect(slider.getAttribute("aria-valuetext")).toMatch(/16 Sept? 2026/);
    expect(quarter("Leading")).toHaveTextContent("Banks");
    expect(quarter("Improving")).toHaveTextContent("IT - Software");
  });

  it("plays a session at a time to the latest and stops there", () => {
    vi.useFakeTimers();
    const slider = replay();
    fireEvent.change(slider, { target: { value: "0" } });

    fireEvent.click(screen.getByRole("button", { name: "Play through the sessions" }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(slider).toHaveValue("1");
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(slider).toHaveValue("2");
    expect(screen.getByRole("button", { name: "Play through the sessions" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slider).toHaveValue("2");
  });

  it("plays from the first session again when it has reached the latest", () => {
    vi.useFakeTimers();
    const slider = replay();

    fireEvent.click(screen.getByRole("button", { name: "Play through the sessions" }));

    expect(slider).toHaveValue("0");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(slider).toHaveValue("1");
  });

  it("pauses when pressed again, and when the slider is dragged", () => {
    vi.useFakeTimers();
    const slider = replay();
    fireEvent.change(slider, { target: { value: "0" } });

    fireEvent.click(screen.getByRole("button", { name: "Play through the sessions" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slider).toHaveValue("0");

    fireEvent.click(screen.getByRole("button", { name: "Play through the sessions" }));
    fireEvent.change(slider, { target: { value: "1" } });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(slider).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Play through the sessions" })).toBeInTheDocument();
  });

  it("draws the path a sector took while it is pointed at", () => {
    replay();
    const plot = screen.getByRole("group", { name: "Sectors" });
    expect(screen.queryByTestId("rotation-trail")).not.toBeInTheDocument();

    fireEvent.mouseEnter(within(plot).getByRole("link", { name: /^IT - Software/ }));

    const trail = screen.getByTestId("rotation-trail");
    expect(trail.querySelector("polyline")?.getAttribute("points")?.split(" ")).toHaveLength(3);
    // The reading follows the sector, here on the latest session.
    expect(screen.getByRole("tooltip")).toHaveTextContent("IT - Software");
  });
});
