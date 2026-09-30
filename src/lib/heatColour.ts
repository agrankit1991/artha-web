/**
 * The colour of a heatmap tile, and the colour of the text on it.
 *
 * A tile's colour says how far its company moved against the period's
 * reach: a fall through a neutral to a rise, clamped at the reach so one
 * company up forty per cent does not wash every other tile to grey. The
 * reach widens with the period, because three per cent is a big day and
 * an ordinary year.
 *
 * The three colours are tokens (`--heat-loss`, `--heat-flat`,
 * `--heat-gain`), mixed here in OKLab, where a halfway mix looks halfway,
 * rather than in sRGB, where it turns muddy. Mixing in script rather than
 * with CSS `color-mix` is what lets each tile's text be chosen by its
 * actual contrast against the tile, which a fixed rule cannot promise in
 * both modes.
 */

import { tokenColour } from "@/lib/tokenColour";

/** A period a heatmap can be coloured by, and how far a move saturates it. */
export interface HeatPeriod<Key extends string = string> {
  key: Key;
  label: string;
  /** The move, in per cent either way, drawn at full colour. */
  reach: number;
}

/**
 * The move over each period drawn at full colour, in per cent either way:
 * three per cent is a big day and an ordinary year. One table for every
 * heat colour on the site, so a strong month is the same green on the
 * heatmap, the sectors table and anywhere else a move is tinted.
 */
export const HEAT_REACH = {
  day: 3,
  one_week: 6,
  one_month: 10,
  three_months: 20,
  six_months: 30,
  year_to_date: 30,
  one_year: 50,
  /** A yearly rate over several years, as a fund's three- and five-year returns are. */
  yearly_rate: 25,
} as const;

/** A colour's red, green and blue, each 0 to 255. */
export type Rgb = readonly [number, number, number];

/** A tile's fill, and the text that reads on it. */
export interface HeatPaint {
  fill: string;
  ink: string;
}

/** The tokens a tile is painted with, resolved. */
export interface HeatPalette {
  loss: Rgb;
  flat: Rgb;
  gain: Rgb;
  /** Text on a dark tile. */
  light: Rgb;
  /** Text on a light tile. */
  dark: Rgb;
}

const LIGHT_INK = "var(--heat-ink-light)";
const DARK_INK = "var(--heat-ink-dark)";

/**
 * How far a move goes toward full colour, either way.
 *
 * @param change - The move in per cent, or null when unknown.
 * @param reach - The move drawn at full colour.
 * @returns From -1 (a full fall) to 1 (a full rise); null when unknown.
 */
export function heatShare(change: number | null, reach: number): number | null {
  if (change === null) {
    return null;
  }
  return Math.max(-1, Math.min(1, change / reach));
}

/**
 * The paint for one tile.
 *
 * @param share - How far toward full colour, from `heatShare`; null is
 *   unknown, drawn as the neutral.
 * @param palette - The three colours, resolved; null where the stylesheet
 *   cannot be read (under test), when the tile falls back to CSS mixing.
 * @returns The fill and the ink.
 */
export function heatPaint(share: number | null, palette: HeatPalette | null): HeatPaint {
  // Eased by a square root: drawn in straight proportion, a one per cent
  // day against a three per cent reach was a third of the colour, and an
  // ordinary day's map was a wash of pale tiles. Full colour stays at the
  // reach.
  const strength = Math.sqrt(Math.abs(share ?? 0));
  if (palette === null) {
    const toward = (share ?? 0) >= 0 ? "var(--heat-gain)" : "var(--heat-loss)";
    return {
      fill: `color-mix(in oklab, ${toward} ${String(Math.round(strength * 100))}%, var(--heat-flat))`,
      ink: strength >= 0.5 ? LIGHT_INK : DARK_INK,
    };
  }
  const fill = mix(palette.flat, (share ?? 0) >= 0 ? palette.gain : palette.loss, strength);
  return {
    fill: `rgb(${fill.map((part) => String(Math.round(part))).join(" ")})`,
    ink: contrast(fill, palette.light) >= contrast(fill, palette.dark) ? LIGHT_INK : DARK_INK,
  };
}

/**
 * The tile colours as the stylesheet has them now, in whichever mode.
 *
 * @returns The colours; null when any token cannot be read as a colour.
 */
export function heatPalette(): HeatPalette | null {
  const read = (token: string): Rgb | null => parseHex(tokenColour(`var(--heat-${token})`));
  const loss = read("loss");
  const flat = read("flat");
  const gain = read("gain");
  const light = read("ink-light");
  const dark = read("ink-dark");
  return loss === null || flat === null || gain === null || light === null || dark === null
    ? null
    : { loss, flat, gain, light, dark };
}

/**
 * Read a `#rrggbb` colour.
 *
 * @param colour - The colour.
 * @returns Its parts, or null for anything else.
 */
export function parseHex(colour: string): Rgb | null {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour.trim());
  if (hex === null) {
    return null;
  }
  const [red = 0, green = 0, blue = 0] = hex.slice(1).map((pair) => Number.parseInt(pair, 16));
  return [red, green, blue];
}

/**
 * Mix two colours in OKLab.
 *
 * @param from - The colour at nought.
 * @param to - The colour at one.
 * @param share - How far from one to the other.
 * @returns The mix, in sRGB.
 */
export function mix(from: Rgb, to: Rgb, share: number): Rgb {
  const start = toOklab(from);
  const end = toOklab(to);
  return fromOklab([
    start[0] + (end[0] - start[0]) * share,
    start[1] + (end[1] - start[1]) * share,
    start[2] + (end[2] - start[2]) * share,
  ]);
}

/**
 * The WCAG contrast ratio between two colours.
 *
 * @param one - A colour.
 * @param other - Another.
 * @returns From 1 (the same) to 21 (black on white).
 */
export function contrast(one: Rgb, other: Rgb): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG relative luminance. */
function luminance(colour: Rgb): number {
  const [red, green, blue] = colour.map(linear) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** An sRGB channel, 0 to 255, as linear light, 0 to 1. */
function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Linear light, 0 to 1, as an sRGB channel, 0 to 255, kept in range. */
function gamma(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  const encoded = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return encoded * 255;
}

/** sRGB to OKLab (Björn Ottosson, 2020). */
function toOklab(colour: Rgb): [number, number, number] {
  const [red, green, blue] = colour.map(linear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab to sRGB (Björn Ottosson, 2020). */
function fromOklab([lightness, a, b]: [number, number, number]): Rgb {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
