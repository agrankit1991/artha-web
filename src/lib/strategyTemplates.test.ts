/** Tests for the texts a new strategy starts from. */

import { describe, expect, it } from "vitest";

import { STRATEGY_TEMPLATE, combinationTemplate } from "./strategyTemplates";

describe("strategy templates", () => {
  it("names itself and ranks, the two settings a strategy needs", () => {
    expect(STRATEGY_TEMPLATE).toMatch(/^name = "My momentum"$/m);
    expect(STRATEGY_TEMPLATE).toMatch(/^rank = /m);
  });

  it("plays the first two saved strategies, quoted as TOML strings", () => {
    const text = combinationTemplate(['Say "hi"', "Calm", "Third"]);

    expect(text).toContain('strategy = "Say \\"hi\\""');
    expect(text).toContain('strategy = "Calm"');
    expect(text).not.toContain("Third");
  });

  it("stands in for strategies not saved yet", () => {
    const text = combinationTemplate(["Only one"]);

    expect(text).toContain('strategy = "Only one"');
    expect(text).toContain('strategy = "A saved strategy"');
  });
});
