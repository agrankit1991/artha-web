/**
 * Tests that the brand palette is whole and readable in both modes.
 *
 * The stylesheet is the one place a colour is decided, and nothing else in
 * the build notices when a token goes missing from one mode or a pair of
 * colours stops being readable against each other: a missing token falls
 * back silently to the other mode's value, and a faint pair only shows up
 * when somebody squints at it. So both are checked here, against the source.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Read from disk rather than imported: Vite's Tailwind plugin owns `.css`
// imports and hands back the compiled output, not the source this checks.
// Resolved from the working directory because the tests run under jsdom,
// where a module URL is an http one that `readFileSync` refuses.
const STYLESHEET = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

/** The declarations of one rule, as token to value. */
function tokens(selector: string): Map<string, string> {
  const at = STYLESHEET.indexOf(`${selector} {`);
  expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
  const body = STYLESHEET.slice(at, STYLESHEET.indexOf("\n}", at)).replace(/\/\*[\s\S]*?\*\//g, "");
  return new Map(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
      match[1] ?? "",
      (match[2] ?? "").trim(),
    ]),
  );
}

const MODES = { light: tokens(":root"), dark: tokens(".dark") };

/**
 * Relative luminance of a `#rrggbb` colour, as WCAG 2 defines it.
 *
 * @param hex - The colour.
 * @returns Its luminance, from 0 (black) to 1 (white).
 */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio of two `#rrggbb` colours. */
function contrast(one: string, other: string): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/**
 * Every pair a screen draws text in, with the ratio it must reach.
 *
 * 4.5:1 is WCAG's floor for ordinary text, which is what nearly all of this
 * site is: figures in tables, labels, links.
 */
const PAIRS: [text: string, surface: string][] = [
  ["--foreground", "--background"],
  ["--card-foreground", "--card"],
  ["--muted-foreground", "--card"],
  ["--muted-foreground", "--background"],
  ["--muted-foreground", "--muted"],
  ["--primary-foreground", "--primary"],
  ["--primary", "--card"],
  ["--primary", "--background"],
  ["--chrome-foreground", "--chrome"],
  ["--wordmark-artha", "--chrome"],
  ["--wordmark-science", "--chrome"],
  ["--destructive", "--card"],
  ["--destructive-foreground", "--destructive"],
  ["--gain", "--card"],
  ["--loss", "--card"],
  ["--caution", "--card"],
];

/** Every token a screen relies on; a mode missing one borrows the other's. */
const REQUIRED = [
  ...new Set(PAIRS.flat()),
  "--popover",
  "--secondary",
  "--accent",
  "--border",
  "--input",
  "--ring",
  "--chrome-accent",
  "--chrome-border",
  "--brand",
  "--overlay",
  "--heat-gain",
  "--heat-loss",
  "--heat-flat",
  "--heat-ink-light",
  "--heat-ink-dark",
];

describe("the brand palette", () => {
  it.each(Object.keys(MODES))("states every token in %s mode", (mode) => {
    const declared = MODES[mode as keyof typeof MODES];
    for (const token of REQUIRED) {
      expect(declared.has(token), `${mode} leaves ${token} to the other mode`).toBe(true);
    }
  });

  it.each(Object.keys(MODES))(
    "keeps the page, the cards and the chrome apart in %s mode",
    (mode) => {
      // Three surfaces with three different values: a palette where the page
      // and the card are the same colour has no depth to it.
      const declared = MODES[mode as keyof typeof MODES];
      const surfaces = ["--background", "--card", "--chrome"].map((token) => declared.get(token));

      expect(new Set(surfaces).size).toBe(3);
    },
  );

  it.each(
    Object.keys(MODES).flatMap((mode) => PAIRS.map(([text, surface]) => [mode, text, surface])),
  )("reads %s: %s on %s at 4.5:1 or better", (mode, text, surface) => {
    const declared = MODES[mode as keyof typeof MODES];
    const ratio = contrast(declared.get(text) ?? "", declared.get(surface) ?? "");

    expect(ratio, `${text} on ${surface} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it("never paints a rise, a fall or a caution in a brand colour", () => {
    // Green has to mean "up" and nothing else; a button that is the colour
    // of a rise, or of a warning, says something it does not mean.
    for (const declared of Object.values(MODES)) {
      const brand = ["--primary", "--brand", "--wordmark-artha", "--wordmark-science"].map(
        (token) => declared.get(token),
      );
      for (const market of ["--gain", "--loss", "--caution"]) {
        expect(brand).not.toContain(declared.get(market));
      }
    }
  });

  it("offers no switchable accent palettes any more", () => {
    // Retired for the one brand palette on 2026-09-30.
    expect(STYLESHEET).not.toContain("data-accent");
  });
});
