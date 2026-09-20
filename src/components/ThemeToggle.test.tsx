/** Tests for switching between light, dark and following the system. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider } from "@/lib/theme";

function stubSystem(dark: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: dark,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
}

/** Which choice the control reports as in force. */
function shown(): string | null | undefined {
  return screen
    .getAllByRole("button")
    .find((button) => button.getAttribute("aria-pressed") === "true")
    ?.getAttribute("aria-label");
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
  it("shows all three choices, and which one is in force", () => {
    // Visible without opening anything: there are three states and they
    // fit, so hiding them behind a click would buy nothing.
    stubSystem(false);

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(shown()).toBe("System");
  });

  it("changes the theme, and says so without relying on colour", async () => {
    stubSystem(false);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(shown()).toBe("Dark");
  });

  it("goes back to following the system", async () => {
    stubSystem(true);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(document.documentElement).not.toHaveClass("dark");

    await userEvent.click(screen.getByRole("button", { name: "System" }));

    expect(document.documentElement).toHaveClass("dark");
  });
});
