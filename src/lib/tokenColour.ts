/**
 * Turning a stylesheet token into a colour a canvas can draw with.
 *
 * Chart colours are references to tokens (`var(--chart-1)`), so light and
 * dark are decided once, in `index.css`. HTML takes a reference as it is;
 * a canvas cannot, so `Chart` resolves each one when it draws.
 */

/**
 * The colour a `var(--name)` reference stands for right now.
 *
 * @param colour - A reference to a token, or a colour already.
 * @param root - Where the token is read from; the document's root by default,
 *   which carries the light or dark class.
 * @returns The token's current value; or what was given when it is not a
 *   reference, or when no stylesheet gives the token a value (under test,
 *   where none is loaded, which lets a test see which token was asked for).
 */
export function tokenColour(colour: string, root: Element = document.documentElement): string {
  if (!colour.startsWith("var(--") || !colour.endsWith(")")) {
    return colour;
  }
  const value = getComputedStyle(root).getPropertyValue(colour.slice(4, -1)).trim();
  return value === "" ? colour : value;
}

/**
 * A colour made see-through.
 *
 * @param colour - A `#rrggbb` colour; anything else is returned unchanged,
 *   since it cannot be taken apart here.
 * @param alpha - How opaque, from 0 to 1.
 * @returns The colour as `rgba(...)`.
 */
export function translucent(colour: string, alpha: number): string {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);
  if (hex === null) {
    return colour;
  }
  const [red, green, blue] = hex.slice(1).map((pair) => Number.parseInt(pair, 16));
  return `rgba(${String(red)}, ${String(green)}, ${String(blue)}, ${String(alpha)})`;
}
