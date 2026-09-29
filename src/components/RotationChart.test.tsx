/** Tests for the plot of month against week. */

import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderPage } from "@/test/support";

import { RotationChart, type RotationPoint } from "./RotationChart";

/** A group at a month's and a week's return. */
function point(name: string, month: number, week: number, companies = 10): RotationPoint {
  return { name, href: `/sector/${name.toLowerCase()}`, month, week, companies };
}

const FOUR = [
  point("Sugar", 10, 4, 40),
  point("Paper", 6, -1),
  point("Steel", -8, -2),
  point("Glass", -3, 3),
  point("Tyres", 1, 0.5),
];

describe("RotationChart", () => {
  it("puts each group in its quarter and names the furthest in each", () => {
    renderPage(<RotationChart points={FOUR} label="Sectors" />);

    const plot = screen.getByRole("group", { name: "Sectors" });
    expect(within(plot).getAllByRole("link")).toHaveLength(5);
    // Named beneath, furthest first: Sugar is further into leading than Tyres.
    const leading = screen.getByText("Leading", { selector: "dt span" }).closest("div");
    expect(leading).toHaveTextContent("Leading 2Up over the month and the week");
    expect(leading).toHaveTextContent("Sugar, Tyres");
    expect(screen.getByText("Weakening", { selector: "dt span" }).closest("div")).toHaveTextContent(
      "Paper",
    );
    expect(screen.getByText("Lagging", { selector: "dt span" }).closest("div")).toHaveTextContent(
      "Steel",
    );
    expect(screen.getByText("Improving", { selector: "dt span" }).closest("div")).toHaveTextContent(
      "Glass",
    );
  });

  it("sizes a dot by the companies it rests on and places it by its returns", () => {
    renderPage(<RotationChart points={FOUR} label="Sectors" />);

    const sugar = screen.getByRole("link", { name: /^Sugar:/ });
    const paper = screen.getByRole("link", { name: /^Paper:/ });
    expect(sugar.style.width).toBe("22px");
    expect(Number.parseFloat(paper.style.width)).toBeLessThan(22);
    // The furthest month reaches a tenth short of the edge; up is higher.
    expect(Number.parseFloat(sugar.style.left)).toBeCloseTo(95.45, 1);
    expect(Number.parseFloat(sugar.style.top)).toBeCloseTo(4.55, 1);
    expect(
      Number.parseFloat(screen.getByRole("link", { name: /^Steel:/ }).style.left),
    ).toBeLessThan(50);
  });

  it("marks each axis at round values either side of nought", () => {
    renderPage(<RotationChart points={FOUR} label="Sectors" />);

    // A month reaching eleven marks every five; a week reaching 4.4, every two.
    for (const mark of ["-10%", "-5%", "+5%", "+10%", "-4%", "-2%", "+2%", "+4%"]) {
      expect(screen.getByText(mark)).toBeInTheDocument();
    }
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("reaches at least a per cent either way, so small returns look small", () => {
    renderPage(<RotationChart points={[point("Tea", 0.3, -0.2)]} label="Tea" />);

    // Nothing reaches one, so the axis reaches 1.1 and marks every half.
    expect(screen.getAllByText("+0.5%")).toHaveLength(2);
    expect(screen.getAllByText("-1%")).toHaveLength(2);
  });

  it("reads a group's figures on hover and on focus, turned inwards near an edge", () => {
    renderPage(<RotationChart points={FOUR} label="Sectors" />);

    const sugar = screen.getByRole("link", { name: /^Sugar:/ });
    fireEvent.mouseEnter(sugar);
    const reading = screen.getByRole("tooltip");
    expect(reading).toHaveTextContent("Sugar");
    expect(reading).toHaveTextContent("Month +10.00% · week +4.00%");
    expect(reading).toHaveTextContent("40 companies");
    // At the top right: drawn to the left of the dot and below it.
    expect(reading).toHaveClass("-translate-x-full", "mt-4");
    fireEvent.mouseLeave(sugar);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    const steel = screen.getByRole("link", { name: /^Steel:/ });
    fireEvent.focus(steel);
    expect(screen.getByRole("tooltip")).toHaveClass("ml-3", "-translate-y-full");
    fireEvent.blur(steel);

    fireEvent.focus(screen.getByRole("link", { name: /^Tyres:/ }));
    expect(screen.getByRole("tooltip")).toHaveClass("-translate-x-1/2");
  });

  it("draws the empty quarters when there is nothing to place", () => {
    renderPage(<RotationChart points={[]} label="Nothing" />);

    expect(within(screen.getByRole("group", { name: "Nothing" })).queryByRole("link")).toBeNull();
    expect(screen.getAllByText("None")).toHaveLength(4);
  });
});
