/** Global test setup: jest-dom matchers, and the browser APIs jsdom lacks. */

import "@testing-library/jest-dom/vitest";

/*
 * Radix's popovers -- select, dropdown menu -- use pointer capture and
 * scrolling APIs that jsdom does not implement. Without these, opening one
 * in a test throws rather than opening, and every test of a component built
 * on one fails for a reason that has nothing to do with the component.
 */
Element.prototype.hasPointerCapture = (): boolean => false;
Element.prototype.setPointerCapture = (): void => undefined;
Element.prototype.releasePointerCapture = (): void => undefined;
Element.prototype.scrollIntoView = (): void => undefined;

/*
 * jsdom implements no `matchMedia` at all, and the theme asks it what the
 * machine prefers. Defaulting to a light preference with no listeners: a
 * test that cares stubs it, and every other test would otherwise fail on a
 * missing function rather than on anything it meant to check.
 */
window.matchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: (): void => undefined,
    removeEventListener: (): void => undefined,
    addListener: (): void => undefined,
    removeListener: (): void => undefined,
    dispatchEvent: (): boolean => false,
  }) as MediaQueryList;

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe(): void {
      return undefined;
    }
    unobserve(): void {
      return undefined;
    }
    disconnect(): void {
      return undefined;
    }
  };
}
