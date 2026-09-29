/** Tests for how a day's moves were spread. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { bucketed, MoveSpread } from "./MoveSpread";

describe("MoveSpread", () => {
  it("draws a bar per bucket, each counted and named", () => {
    render(<MoveSpread changes={["1.50", "-3.00", "0", null]} />);

    expect(
      screen.getByRole("img", {
        name: "< -5%: 0, -5 to -2%: 1, -2 to 0%: 0, 0%: 1, 0 to 2%: 1, 2 to 5%: 0, > 5%: 0",
      }),
    ).toBeInTheDocument();
  });

  it("draws nothing when nothing moved", () => {
    const { container } = render(<MoveSpread changes={[null]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("bucketed", () => {
  it("counts each move into one bucket, on the boundaries too", () => {
    const counted = bucketed(["-7", "-5", "-2", "-0.5", "0", "0.5", "2", "5", "9", null]);

    // < -5 | -5..-2 | -2..0 | 0 | 0..2 | 2..5 | > 5
    expect(counted).toEqual([1, 1, 2, 1, 2, 1, 1]);
    expect(counted.reduce((sum, one) => sum + one, 0)).toBe(9);
  });
});
