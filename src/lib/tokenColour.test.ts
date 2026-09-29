/** Tests for turning a stylesheet token into a colour a canvas can draw with. */

import { afterEach, describe, expect, it } from "vitest";

import { tokenColour, translucent } from "./tokenColour";

afterEach(() => {
  document.documentElement.style.removeProperty("--chart-1");
});

describe("tokenColour", () => {
  it("reads the value a token has right now", () => {
    document.documentElement.style.setProperty("--chart-1", "#0097b2");

    expect(tokenColour("var(--chart-1)")).toBe("#0097b2");
  });

  it("hands back a colour that is not a reference", () => {
    expect(tokenColour("#123456")).toBe("#123456");
    expect(tokenColour("var(--not-closed")).toBe("var(--not-closed");
  });

  it("hands back the reference when no stylesheet gives it a value", () => {
    // As under test, where none is loaded: better the name than a blank.
    expect(tokenColour("var(--chart-9)")).toBe("var(--chart-9)");
  });
});

describe("translucent", () => {
  it("makes a hex colour see-through", () => {
    expect(translucent("#0097b2", 0.35)).toBe("rgba(0, 151, 178, 0.35)");
  });

  it("leaves anything it cannot take apart alone", () => {
    expect(translucent("var(--gain)", 0.35)).toBe("var(--gain)");
  });
});
