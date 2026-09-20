/**
 * Tests that every accent on offer is one the stylesheet can actually paint.
 *
 * The interface cannot check this for itself: the menu lists accents from
 * TypeScript and the colours come from CSS, and nothing in between complains
 * when the two disagree. An accent offered with no rule behind it applies
 * cleanly, changes nothing, and looks exactly like a broken theme switcher.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ACCENTS } from "./theme";

// Read from disk rather than imported: Vite's Tailwind plugin owns `.css`
// imports and hands back the compiled output, not the source this is
// checking. Resolved from the working directory because the tests run
// under jsdom, where a module URL is an http one that `readFileSync`
// refuses.
const STYLESHEET = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

/** The accents that need a rule; the neutral one is the stylesheet's default. */
const COLOURED = ACCENTS.filter((accent) => accent !== "slate");

describe("accents", () => {
  it.each(COLOURED)("%s has a rule of its own", (accent) => {
    expect(STYLESHEET).toContain(`[data-accent="${accent}"]`);
  });

  it.each(COLOURED)("%s states its own hue and turns the tint on", (accent) => {
    // The tint is what carries the accent into the surfaces, borders and
    // muted tones. Without it an accent recolours a few icons and leaves
    // the rest of the page grey, which reads as a switch that does nothing.
    const rule = STYLESHEET.slice(STYLESHEET.indexOf(`[data-accent="${accent}"]`));
    const body = rule.slice(0, rule.indexOf("}"));

    expect(body).toMatch(/--hue:\s*\d+/);
    expect(body).toMatch(/--tint:\s*1/);
    expect(body).toMatch(/--primary:/);
  });

  it.each(COLOURED)("%s is lifted for a dark surface", (accent) => {
    // The light-mode accents read muddy against a dark background.
    expect(STYLESHEET).toContain(`.dark[data-accent="${accent}"]`);
  });

  it("offers no accent the stylesheet has never heard of", () => {
    const declared = [...STYLESHEET.matchAll(/\[data-accent="(\w+)"\]/g)].map((match) => match[1]);

    expect(new Set(declared)).toEqual(new Set(COLOURED));
  });

  it("never lets an accent repaint a rise or a fall", () => {
    // Green has to mean "up" on every theme. A `--gain` inside an accent
    // block would make that a matter of which colour somebody picked.
    for (const accent of COLOURED) {
      const rule = STYLESHEET.slice(STYLESHEET.indexOf(`[data-accent="${accent}"]`));
      const body = rule.slice(0, rule.indexOf("}"));
      expect(body).not.toContain("--gain");
      expect(body).not.toContain("--loss");
    }
  });

  it("derives the surfaces from the hue rather than fixing them grey", () => {
    // The check that would have caught the first attempt at this, where
    // only `--primary` and `--ring` moved and the page stayed grey.
    for (const token of ["--background", "--card", "--muted", "--border", "--accent"]) {
      const declaration = STYLESHEET.slice(STYLESHEET.indexOf(`${token}:`));
      expect(declaration.slice(0, declaration.indexOf(";"))).toContain("var(--hue)");
    }
  });
});
