/** Tests for the dialog that writes a list as a TradingView watchlist. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TradingViewExportDialog, fileName } from "./TradingViewExportDialog";
import type { KeyCollection } from "@/lib/keySource";
import { readPreferences } from "@/lib/preferences";
import { renderPage, stubPlatform } from "@/test/support";

/** What `replace` put in place, to be undone after each test. */
const undo: (() => void)[] = [];

/**
 * Give an object a property for one test: the clipboard and object
 * addresses jsdom does not have. Defined rather than spread into a copy,
 * which would lose the object's prototype.
 */
function replace(target: object, name: string, value: unknown): void {
  const before = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { value, configurable: true, writable: true });
  undo.push(() => {
    if (before === undefined) {
      Reflect.deleteProperty(target, name);
    } else {
      Object.defineProperty(target, name, before);
    }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const one of undo.splice(0)) {
    one();
  }
});

/** A collected list of the given keys. */
function ready(keys: string[], over = false): KeyCollection {
  return { phase: "ready", collected: { keys, over } };
}

/** Answer that every key is known to TradingView, by its own name. */
function knownAll(derived = false): Record<string, { bodyFor: (path: string) => unknown }> {
  return {
    "/api/external-symbols": {
      bodyFor: (path) =>
        new URLSearchParams(path.split("?")[1]).getAll("keys").map((key) => ({
          instrument_key: key,
          symbol: `NSE:${key.split("|")[1] ?? key}`,
          derived,
        })),
    },
  };
}

function open(collection: KeyCollection, onClose = vi.fn()): ReturnType<typeof renderPage> {
  return renderPage(
    <TradingViewExportDialog open onClose={onClose} label="Top gainers" collection={collection} />,
  );
}

describe("TradingViewExportDialog", () => {
  it("waits for the list, and says why when it could not be read", () => {
    const { rerender } = open({ phase: "collecting" });
    expect(screen.getByText(/Looking up TradingView/)).toBeVisible();

    rerender(
      <TradingViewExportDialog
        open
        onClose={vi.fn()}
        label="Top gainers"
        collection={{ phase: "failed", message: "Screen refused" }}
      />,
    );
    expect(screen.getByText("Screen refused")).toBeVisible();
  });

  it("writes the list for pasting, and copies it", async () => {
    stubPlatform(knownAll());
    const writeText = vi.fn(() => Promise.resolve());
    replace(navigator, "clipboard", { writeText });
    open(ready(["NSE_EQ|AAA", "NSE_EQ|BBB"]));

    expect(await screen.findByLabelText("Symbols for TradingView")).toHaveValue("NSE:AAA,NSE:BBB");
    expect(screen.getByText("2 symbols.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Copy 2 symbols" }));

    expect(writeText).toHaveBeenCalledWith("NSE:AAA,NSE:BBB");
    expect(screen.getByRole("button", { name: "Copied 2" })).toBeVisible();
  });

  it("selects the symbols when the clipboard is refused", async () => {
    stubPlatform(knownAll());
    replace(navigator, "clipboard", {
      writeText: () => Promise.reject(new Error("denied")),
    });
    open(ready(["NSE_EQ|AAA"]));

    await screen.findByLabelText("Symbols for TradingView");
    await userEvent.click(screen.getByRole("button", { name: "Copy 1 symbol" }));

    expect(screen.getByText(/The browser refused the clipboard/)).toBeVisible();
  });

  it("cuts a long list into parts of the chosen size, and remembers the size", async () => {
    stubPlatform(knownAll());
    const keys = Array.from({ length: 65 }, (_, at) => `NSE_EQ|S${String(at)}`);
    open(ready(keys));
    await screen.findByLabelText("Symbols for TradingView");

    await userEvent.click(
      within(screen.getByRole("group", { name: "Symbols per list" })).getByRole("button", {
        name: "30",
      }),
    );
    expect(readPreferences().exportSize).toBe("30");
    await userEvent.click(
      within(screen.getByRole("group", { name: "Part" })).getByRole("button", { name: "31-60" }),
    );

    expect(screen.getByText("Part 2 of 3: symbols 31-60 of 65.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy 30 symbols" })).toBeVisible();
  });

  it("downloads the part shown as a text file named after the list", async () => {
    stubPlatform(knownAll());
    const created = vi.fn(() => "blob:list");
    const revoked = vi.fn();
    replace(URL, "createObjectURL", created);
    replace(URL, "revokeObjectURL", revoked);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    open(ready(Array.from({ length: 65 }, (_, at) => `NSE_EQ|S${String(at)}`)));
    await screen.findByLabelText("Symbols for TradingView");
    await userEvent.click(
      within(screen.getByRole("group", { name: "Symbols per list" })).getByRole("button", {
        name: "30",
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Download .txt" }));

    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe("top-gainers-1.txt");
    expect(revoked).toHaveBeenCalledWith("blob:list");

    await userEvent.click(
      within(screen.getByRole("group", { name: "Symbols per list" })).getByRole("button", {
        name: "All",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Download .txt" }));
    expect((click.mock.contexts[1] as HTMLAnchorElement).download).toBe("top-gainers.txt");
  });

  it("says what was left out, guessed, or cut", async () => {
    stubPlatform({
      "/api/external-symbols": {
        body: [
          { instrument_key: "NSE_EQ|A", symbol: "NSE:A", derived: true },
          { instrument_key: "NSE_EQ|B", symbol: "NSE:B", derived: true },
        ],
      },
    });
    open(ready(["NSE_EQ|A", "NSE_EQ|B", "NSE_EQ|gone"], true));

    expect(await screen.findByText(/1 left out: TradingView has no symbol for it/)).toBeVisible();
    expect(screen.getByText(/2 were worked out from the ticker/)).toBeVisible();
    expect(screen.getByText(/Only the first 1,000 of a longer list are taken/)).toBeVisible();
  });

  it("speaks of one guessed and several missing", async () => {
    stubPlatform({
      "/api/external-symbols": {
        body: [{ instrument_key: "NSE_EQ|A", symbol: "NSE:A", derived: true }],
      },
    });
    open(ready(["NSE_EQ|A", "NSE_EQ|x", "NSE_EQ|y"]));

    expect(await screen.findByText(/2 left out: TradingView has no symbol for them/)).toBeVisible();
    expect(screen.getByText(/1 was worked out from the ticker/)).toBeVisible();
  });

  it("says when TradingView knows nothing on the list, or could not be asked", async () => {
    stubPlatform({ "/api/external-symbols": { body: [] } });
    const { unmount } = open(ready(["NSE_EQ|x"]));
    expect(await screen.findByText(/TradingView has no symbol for anything/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Download .txt" })).toBeDisabled();
    unmount();

    stubPlatform({ "/api/external-symbols": { status: 500, body: { detail: "lookup failed" } } });
    open(ready(["NSE_EQ|x"]));
    expect(await screen.findByText("lookup failed")).toBeVisible();
  });

  it("ignores an answer that arrives after it closed", () => {
    let answer: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      ),
    );
    const { rerender } = open(ready(["NSE_EQ|A"]));
    rerender(
      <TradingViewExportDialog
        open={false}
        onClose={vi.fn()}
        label="Top gainers"
        collection={ready(["NSE_EQ|A"])}
      />,
    );
    answer({ ok: true, status: 200, json: () => Promise.resolve([]) });

    expect(screen.queryByText(/TradingView has no symbol/)).toBeNull();
  });
});

describe("fileName", () => {
  it("is the label in letters, digits and hyphens", () => {
    expect(fileName("Top gainers, Nifty 500", null)).toBe("top-gainers-nifty-500.txt");
    expect(fileName("Picks today, M147", 2)).toBe("picks-today-m147-2.txt");
    expect(fileName("!!!", null)).toBe("watchlist.txt");
  });
});
