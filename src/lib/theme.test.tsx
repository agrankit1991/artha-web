/** Tests for the theme, and for a choice about it surviving a reload. */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "./theme";

interface MediaListener {
  (event: MediaQueryListEvent): void;
}

let listeners: MediaListener[] = [];

/** Stub the system preference, and keep hold of whoever listens to it. */
function stubSystem(dark: boolean): void {
  listeners = [];
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: dark,
      media: query,
      addEventListener: (_name: string, listener: MediaListener) => listeners.push(listener),
      removeEventListener: () => undefined,
    })),
  );
}

function Probe(): React.JSX.Element {
  const { choice, appearance, accent, setChoice, setAccent } = useTheme();
  return (
    <div>
      <span data-testid="state">{`${choice}/${appearance}`}</span>
      <span data-testid="accent">{accent}</span>
      <button
        type="button"
        onClick={() => {
          setChoice("dark");
        }}
      >
        go dark
      </button>
      <button
        type="button"
        onClick={() => {
          setAccent("orange");
        }}
      >
        go orange
      </button>
    </div>
  );
}

afterEach(() => {
  // Restore before clearing: one test replaces localStorage itself, and
  // clearing through the replacement would fail the next test rather than
  // this one -- which is the hardest kind of failure to read.
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("theme", () => {
  it("follows the system until told otherwise", () => {
    // The third state is not the same as either of the other two: it
    // changes when the machine does, which is what people expect.
    stubSystem(true);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("system/dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("follows the system as it changes, not only as it was", () => {
    stubSystem(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement).not.toHaveClass("dark");

    act(() => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(screen.getByTestId("state")).toHaveTextContent("system/dark");
  });

  it("remembers a choice for the next visit", async () => {
    stubSystem(false);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go dark" }));

    expect(screen.getByTestId("state")).toHaveTextContent("dark/dark");
    expect(window.localStorage.getItem("artha-theme")).toBe("dark");
  });

  it("reads a remembered choice back", () => {
    window.localStorage.setItem("artha-theme", "dark");
    stubSystem(false);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("dark/dark");
  });

  it("carries on when storage is blocked", async () => {
    // A private window throws on read and on write. The application should
    // still work; it just forgets between visits.
    stubSystem(false);
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    vi.spyOn(window, "localStorage", "get").mockReturnValue(storage as unknown as Storage);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "go dark" }));
    await userEvent.click(screen.getByRole("button", { name: "go orange" }));

    expect(screen.getByTestId("state")).toHaveTextContent("dark/dark");
    expect(screen.getByTestId("accent")).toHaveTextContent("orange");
  });

  it("remembers the accent apart from the light and dark choice", async () => {
    // They answer different questions, so changing one must not reset the
    // other, and neither may overwrite the other's stored value.
    stubSystem(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "go orange" }));
    await userEvent.click(screen.getByRole("button", { name: "go dark" }));

    expect(window.localStorage.getItem("artha-accent")).toBe("orange");
    expect(window.localStorage.getItem("artha-theme")).toBe("dark");
    expect(screen.getByTestId("accent")).toHaveTextContent("orange");
  });

  it("starts from the accent a previous visit chose", () => {
    window.localStorage.setItem("artha-accent", "green");
    stubSystem(false);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("accent")).toHaveTextContent("green");
    expect(document.documentElement).toHaveAttribute("data-accent", "green");
  });

  it("ignores a stored accent that is not one", () => {
    window.localStorage.setItem("artha-accent", "chartreuse");
    stubSystem(false);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("accent")).toHaveTextContent("slate");
  });

  it("ignores a stored value that is not a choice", () => {
    window.localStorage.setItem("artha-theme", "purple");
    stubSystem(false);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("system/light");
  });

  it("refuses to be used outside its provider", () => {
    // A wiring mistake, not a state worth rendering around.
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow("ThemeProvider");
  });
});
