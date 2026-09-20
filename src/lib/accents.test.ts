/**
 * Tests that every accent on offer is a whole palette the stylesheet can paint.
 *
 * The interface cannot check this for itself: the menu lists accents from
 * TypeScript and the colours come from CSS, and nothing in between complains
 * when the two disagree. An accent offered with no rule behind it applies
 * cleanly, changes nothing, and looks exactly like a broken theme switcher.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ACCENT_SWATCHES, ACCENTS } from "./theme";

// Read from disk rather than imported: Vite's Tailwind plugin owns `.css`
// imports and hands back the compiled output, not the source this is
// checking. Resolved from the working directory because the tests run
// under jsdom, where a module URL is an http one that `readFileSync`
// refuses.
const STYLESHEET = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

/** The accents that need a rule; the neutral one is the stylesheet's default. */
const COLOURED = ACCENTS.filter((accent) => accent !== "slate");

/**
 * The declarations of one rule.
 *
 * @param selector - The rule's selector, exactly as written.
 * @returns What is between its braces.
 */
function block(selector: string): string {
  const at = STYLESHEET.indexOf(`${selector} {`);
  expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
  return STYLESHEET.slice(at, STYLESHEET.indexOf("}", at));
}

/**
 * Every surface an accent has to restate to be a palette rather than a tint.
 *
 * A theme that changes the buttons and leaves the page, the cards and the
 * chrome where they were is the one that reads as doing nothing.
 */
const SURFACES = [
  "--background",
  "--card",
  "--popover",
  "--primary",
  "--secondary",
  "--muted",
  "--accent",
  "--border",
  "--input",
  "--ring",
  "--layout",
];

describe("accents", () => {
  it.each(COLOURED)("%s repaints every surface, not only the buttons", (accent) => {
    const declarations = block(`[data-accent="${accent}"]`);

    for (const token of SURFACES) {
      expect(declarations, `${accent} leaves ${token} alone`).toContain(`${token}:`);
    }
  });

  it.each(COLOURED)("%s has a palette for a dark surface too", (accent) => {
    // The light-mode palettes read washed out against a dark background.
    const declarations = block(`.dark[data-accent="${accent}"]`);

    for (const token of SURFACES) {
      expect(declarations, `dark ${accent} leaves ${token} alone`).toContain(`${token}:`);
    }
  });

  it.each(COLOURED)("%s keeps the page, the cards and the chrome apart", (accent) => {
    // Three surfaces with three different values. A palette where the page
    // and the card are the same colour has no depth to it.
    const declarations = block(`[data-accent="${accent}"]`);
    const valueOf = (token: string): string =>
      declarations.slice(declarations.indexOf(`${token}:`)).split(";")[0] ?? "";

    const page = valueOf("--background");
    const card = valueOf("--card");
    const chrome = valueOf("--layout");

    expect(new Set([page, card, chrome]).size).toBe(3);
  });

  it("offers no accent the stylesheet has never heard of", () => {
    const declared = [...STYLESHEET.matchAll(/\[data-accent="(\w+)"\]/g)].map(
      (match) => match[1] ?? "",
    );

    expect(new Set(declared)).toEqual(new Set(COLOURED));
  });

  it("never lets an accent repaint a rise or a fall", () => {
    // Green has to mean "up" on every theme. A `--gain` inside an accent
    // would make that a matter of which colour somebody picked.
    for (const accent of COLOURED) {
      for (const selector of [`[data-accent="${accent}"]`, `.dark[data-accent="${accent}"]`]) {
        expect(block(selector)).not.toContain("--gain");
        expect(block(selector)).not.toContain("--loss");
      }
    }
  });

  it("gives the neutral theme the same surfaces to move", () => {
    // It is the default rather than an accent, but it is still a palette,
    // and a token it forgets is one an accent can never hand back.
    for (const token of SURFACES) {
      expect(block(":root")).toContain(`${token}:`);
      expect(block(".dark")).toContain(`${token}:`);
    }
  });

  it("shows a swatch that is the colour pressing it will produce", () => {
    // A swatch merely close to the theme it stands for lies about what the
    // choice does, and that is a hard thing to notice by eye.
    for (const accent of COLOURED) {
      const declarations = block(`[data-accent="${accent}"]`);
      const primary = declarations
        .slice(declarations.indexOf("--primary:"))
        .split(";")[0]
        ?.replace("--primary:", "")
        .trim();

      expect(ACCENT_SWATCHES[accent]).toBe(primary);
    }
  });
});
