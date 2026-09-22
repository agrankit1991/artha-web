/** Tests for net figures drawn either side of nought. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FlowBars } from "./FlowBars";

describe("FlowBars", () => {
  it("draws buying above the line in green and selling below it in red", () => {
    const { container } = render(
      <FlowBars
        label="FII net buying by session"
        bars={[
          { day: "2026-09-21", net: "1200.50", title: "21 Sep: +1,200.50 Cr" },
          { day: "2026-09-22", net: "-3809.99", title: "22 Sep: -3,809.99 Cr" },
          { day: "2026-09-23", net: null, title: "23 Sep: —" },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "FII net buying by session" })).toBeInTheDocument();
    const bars = container.querySelectorAll("rect");
    // The unknown session is left out rather than drawn as nought.
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveClass("fill-gain");
    expect(bars[1]).toHaveClass("fill-loss");
    expect(bars[1]?.querySelector("title")).toHaveTextContent("22 Sep: -3,809.99 Cr");
  });

  it("draws nothing when no session has a figure", () => {
    const { container } = render(
      <FlowBars label="Nothing" bars={[{ day: "2026-09-22", net: null, title: "" }]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
