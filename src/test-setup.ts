import { forgetForTests } from "@/lib/preferences";
import { beforeEach } from "vitest";
/** Global test setup: jest-dom matchers, and the browser APIs jsdom lacks. */

import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

/*
 * How long `findBy` and `waitFor` wait before failing: three seconds, not
 * the library's one. With some fifteen hundred tests in parallel a busy
 * machine sometimes took a little over a second to render a chart's
 * answer, and two tests that pass alone (a drawing picked, a breadth table)
 * failed in turn for it (2026-11-08). A passing test waits no longer; only
 * a failing one takes longer to say so.
 */
configure({ asyncUtilTimeout: 3000 });

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
    // Deprecated, but the type still declares them, so a stub of it must have
    // them; nothing here calls them.
    /* eslint-disable @typescript-eslint/no-deprecated */
    addListener: (): void => undefined,
    removeListener: (): void => undefined,
    /* eslint-enable @typescript-eslint/no-deprecated */
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

// jsdom has no canvas and says so loudly on every getContext. A quiet
// null is what the code under test expects of a browser that cannot draw;
// a test that needs a context spies over this.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

// Preferences persist on purpose; a test must not inherit the last one's.
beforeEach(() => {
  window.localStorage.clear();
  forgetForTests();
});
