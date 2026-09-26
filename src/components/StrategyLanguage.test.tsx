/** Tests for the list of what a rule may use. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPage, stubPlatform } from "@/test/support";

import { StrategyLanguage } from "./StrategyLanguage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StrategyLanguage", () => {
  it("lists the series and functions the platform knows", async () => {
    stubPlatform({
      "/api/strategies/language": {
        body: { series: ["close", "quarter"], functions: ["latch", "sma"] },
      },
    });
    renderPage(<StrategyLanguage />);
    await userEvent.click(screen.getByText("What a rule may use"));

    const series = await screen.findByRole("list", { name: "Series" });
    expect(within(series).getByText("quarter")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Functions" })).getByText("latch"),
    ).toBeInTheDocument();
  });

  it("says so when the list cannot be read", async () => {
    stubPlatform({
      "/api/strategies/language": { status: 500, body: { detail: "language broke" } },
    });
    renderPage(<StrategyLanguage />);
    await userEvent.click(screen.getByText("What a rule may use"));

    expect(await screen.findByText("language broke")).toBeInTheDocument();
  });
});
