/** Tests for a strategy run's state badge. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { strategyRequest } from "@/test/support";

import { RunState, runStateLabel } from "./RunState";

describe("RunState", () => {
  it("says each state in words, never by colour alone", () => {
    for (const [status, word] of [
      ["queued", "Queued"],
      ["running", "Running"],
      ["done", "Done"],
      ["failed", "Failed"],
    ] as const) {
      const { unmount } = render(<RunState latest={strategyRequest({ status })} />);
      expect(screen.getByText(word)).toBeInTheDocument();
      unmount();
    }
    render(<RunState latest={null} />);
    expect(screen.getByText("Not run")).toBeInTheDocument();
  });

  it("draws a failure in the error colour, not a fall's", () => {
    render(<RunState latest={strategyRequest({ status: "failed" })} />);

    const badge = screen.getByText("Failed");
    expect(badge).toHaveClass("text-destructive");
    expect(badge).not.toHaveClass("text-loss");
  });

  it("sorts by the word it shows", () => {
    expect(runStateLabel(null)).toBe("Not run");
    expect(runStateLabel(strategyRequest({ status: "running" }))).toBe("Running");
  });
});
