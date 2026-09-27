/** Tests for a strategy said in plain words. */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { strategyExplanation } from "@/test/support";

import { StrategyExplanationPanel } from "./StrategyExplanationPanel";

describe("StrategyExplanationPanel", () => {
  it("says a single strategy topic by topic, its conditions listed, then its terms", () => {
    render(<StrategyExplanationPanel explanation={strategyExplanation()} />);

    const play = screen.getByRole("region", { name: "Momentum near the high in plain words" });
    expect(within(play).queryByRole("heading")).not.toBeInTheDocument();
    expect(within(play).getByText("Which companies")).toBeInTheDocument();
    expect(
      within(play)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "the average daily value traded over the last month is at least Rs 10 crore",
      "the market value is at least Rs 1,000 crore",
    ]);
    expect(within(play).getByText(/sells a holding once the price is below/)).toBeInTheDocument();
    const terms = screen.getByRole("region", { name: "Terms" });
    expect(within(terms).getByText("Moving average")).toBeInTheDocument();
  });

  it("says how a combination chooses and names each strategy with when it plays", () => {
    const [single] = strategyExplanation().plays;
    if (single === undefined) {
      throw new Error("the fixture has a play");
    }
    render(
      <StrategyExplanationPanel
        explanation={strategyExplanation({
          choosing: [
            "It reads the market at the start of every year.",
            "When none holds, it waits.",
          ],
          plays: [
            { ...single, name: "Trend", when: "while the Nifty 50 is above its 200-day average" },
            { ...single, name: "Calm", when: "otherwise" },
          ],
          terms: [],
        })}
      />,
    );

    expect(screen.getByText("It reads the market at the start of every year.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Trend while the Nifty 50/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Calm otherwise" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Terms" })).not.toBeInTheDocument();
  });
});
