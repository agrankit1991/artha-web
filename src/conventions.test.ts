/**
 * Tests for conventions the source keeps, which no compiler checks.
 *
 * Both are the kind of rule that erodes one convenient exception at a time:
 * a colour written by hand in one component is how two screens start
 * disagreeing about what a falling price looks like, and a dash pasted from
 * elsewhere is how copy drifts from the owner's house style.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

/** Every source file under `src`, as a path relative to it. */
function sources(directory: string = ROOT): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return sources(path);
    }
    return /\.(tsx?|css)$/.test(name) ? [relative(ROOT, path)] : [];
  });
}

const FILES = sources();
const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

/**
 * An en dash, an em dash or a minus sign, built from their code points: a
 * formatter rewrites escapes in a pattern into the characters themselves,
 * and this file would then fail its own rule.
 */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014, 0x2212)}]`);

/** A colour written by hand: a Tailwind palette class or a hex literal. */
const HAND_COLOUR =
  /\b(?:text|bg|border|fill|stroke|ring|from|to|via)-(?:red|green|blue|amber|orange|emerald|sky|violet|purple|zinc|slate|gray|neutral|stone|yellow|lime|teal|cyan|indigo|fuchsia|pink|rose)-\d{2,3}\b|#[0-9a-fA-F]{6}\b/;

/**
 * Where colours are decided, and so may be written out: the stylesheet's
 * tokens, the chart palette, and the share card, which is drawn on a canvas
 * that cannot read a token.
 */
const PALETTES = new Set(["index.css", "lib/chartPalette.ts", "lib/shareCard.ts"]);

/**
 * Files that still write a colour by hand, each waiting for its slice of the
 * brand redesign (`docs/BRAND-PLAN.md`). The list only shrinks: a file that
 * no longer offends fails the test until it is taken off.
 */
const KNOWN = new Set([
  "components/Chart.tsx",
  "components/ComparisonChart.tsx",
  "components/FundamentalsChart.tsx",
  "components/MoverPanel.tsx",
  "routes/Overview.tsx",
  "routes/Watchlists.tsx",
]);

describe("the source", () => {
  it("writes a plain hyphen, never an en dash, an em dash or a minus sign", () => {
    // The owner's house style, and a U+2212 minus also breaks pasting a
    // figure into a spreadsheet.
    const offenders = FILES.filter((file) => DASHES.test(read(file)));

    expect(offenders).toEqual([]);
  });

  it("takes every colour from a token, outside the files that decide them", () => {
    const offenders = FILES.filter(
      (file) => !file.includes(".test.") && !PALETTES.has(file) && HAND_COLOUR.test(read(file)),
    );

    expect(offenders.filter((file) => !KNOWN.has(file))).toEqual([]);
  });

  it("keeps the list of known exceptions honest", () => {
    // A file fixed but left on the list would let the next hand-written
    // colour in it through unnoticed.
    const cured = [...KNOWN].filter((file) => !HAND_COLOUR.test(read(file)));

    expect(cured).toEqual([]);
  });
});
