/** Tests for the theme menu. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeMenu } from "./ThemeMenu";
import { ThemeProvider } from "@/lib/theme";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

function renderMenu(): void {
  render(
    <ThemeProvider>
      <ThemeMenu />
    </ThemeProvider>,
  );
}

async function openMenu(): Promise<void> {
  renderMenu();
  await userEvent.click(screen.getByRole("button", { name: "Theme" }));
}

describe("ThemeMenu", () => {
  it("offers light, dark and the machine's own setting, and nothing else", async () => {
    // The colours are the brand's; how light or dark is the only choice.
    await openMenu();

    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Light", "Dark", "System"]);
  });

  it("darkens the application when asked", async () => {
    await openMenu();

    await userEvent.click(screen.getByRole("menuitem", { name: /Dark/ }));

    expect(document.documentElement).toHaveClass("dark");
  });

  it("remembers the choice across a visit", async () => {
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: /Light/ }));

    expect(window.localStorage.getItem("artha-theme")).toBe("light");
  });

  it("says which choice is in force", async () => {
    await openMenu();

    expect(screen.getByRole("menuitem", { name: /System/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("shows the choice in force on its button, before it is opened", async () => {
    // The icon is the one of the choice made: a moon for dark.
    window.localStorage.setItem("artha-theme", "dark");
    renderMenu();

    const button = screen.getByRole("button", { name: "Theme" });
    expect(button.querySelector("svg.lucide-moon")).not.toBeNull();

    await userEvent.click(button);
    expect(screen.getByRole("menuitem", { name: /Dark/ })).toHaveAttribute("aria-current", "true");
  });
});
