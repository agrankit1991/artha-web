/** Tests for a heatmap tile's colour and its text. */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type HeatPalette,
  contrast,
  heatPaint,
  heatPalette,
  heatShare,
  mix,
  parseHex,
} from "./heatColour";

afterEach(() => {
  vi.restoreAllMocks();
});

/** The light mode's tile colours, as `index.css` states them. */
const LIGHT_MODE: HeatPalette = {
  loss: [0xdc, 0x26, 0x26],
  flat: [0xc9, 0xd6, 0xda],
  gain: [0x15, 0x80, 0x3d],
  light: [255, 255, 255],
  dark: [0x0f, 0x1a, 0x1d],
};

describe("heatShare", () => {
  it("measures a move against the period's reach, clamped at full colour", () => {
    expect(heatShare(1.5, 3)).toBe(0.5);
    expect(heatShare(-9, 3)).toBe(-1);
    expect(heatShare(40, 3)).toBe(1);
    expect(heatShare(null, 3)).toBeNull();
  });
});

describe("heatPaint", () => {
  it("draws a full rise in the gain colour, with light text on it", () => {
    expect(heatPaint(1, LIGHT_MODE)).toEqual({
      fill: "rgb(21 128 61)",
      ink: "var(--heat-ink-light)",
    });
  });

  it("draws no move, or an unknown one, as the neutral, with dark text", () => {
    expect(heatPaint(0, LIGHT_MODE)).toEqual({
      fill: "rgb(201 214 218)",
      ink: "var(--heat-ink-dark)",
    });
    expect(heatPaint(null, LIGHT_MODE).fill).toBe("rgb(201 214 218)");
  });

  it("chooses whichever text reads better on a fall part-way to full", () => {
    const paint = heatPaint(-0.3, LIGHT_MODE);

    expect(paint.fill).not.toBe("rgb(201 214 218)");
    expect(["var(--heat-ink-light)", "var(--heat-ink-dark)"]).toContain(paint.ink);
  });

  it("mixes in the stylesheet when it cannot read the colours", () => {
    // Eased: a quarter of the reach is half the colour.
    expect(heatPaint(-0.25, null)).toEqual({
      fill: "color-mix(in oklab, var(--heat-loss) 50%, var(--heat-flat))",
      ink: "var(--heat-ink-light)",
    });
    expect(heatPaint(0.2, null).ink).toBe("var(--heat-ink-dark)");
  });
});

describe("heatPalette", () => {
  it("reads nothing where no stylesheet gives the tokens values", () => {
    expect(heatPalette()).toBeNull();
  });

  it("reads each token as the stylesheet has it now", () => {
    const values: Record<string, string> = {
      "--heat-loss": "#dc2626",
      "--heat-flat": "#c9d6da",
      "--heat-gain": "#15803d",
      "--heat-ink-light": "#ffffff",
      "--heat-ink-dark": "#0f1a1d",
    };
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (name: string) => values[name] ?? "",
    } as CSSStyleDeclaration);

    expect(heatPalette()).toEqual(LIGHT_MODE);
  });
});

describe("colour arithmetic", () => {
  it("reads only a six-digit hex colour", () => {
    expect(parseHex(" #15803D ")).toEqual([21, 128, 61]);
    expect(parseHex("rgb(1 2 3)")).toBeNull();
  });

  it("mixes from one colour to the other", () => {
    const start = mix(LIGHT_MODE.flat, LIGHT_MODE.gain, 0).map(Math.round);
    const end = mix(LIGHT_MODE.flat, LIGHT_MODE.gain, 1).map(Math.round);

    expect(start).toEqual([...LIGHT_MODE.flat]);
    expect(end).toEqual([...LIGHT_MODE.gain]);
    // Black stays black: the darkest channels take the linear segment.
    expect(mix([0, 0, 0], [0, 0, 0], 0.5).map(Math.round)).toEqual([0, 0, 0]);
  });

  it("measures contrast as WCAG does", () => {
    expect(contrast([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 6);
    expect(contrast([0, 0, 0], [0, 0, 0])).toBe(1);
    // Green-700 under white text: the reason the light mode's rise takes it.
    expect(contrast(LIGHT_MODE.gain, LIGHT_MODE.light)).toBeGreaterThan(4.5);
  });
});
