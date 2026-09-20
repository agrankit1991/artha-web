/** Tests for the theme menu. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeMenu } from "./ThemeMenu";
import { ThemeProvider } from "@/lib/theme";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-accent");
  document.documentElement.classList.remove("dark");
});

async function openMenu(): Promise<void> {
  render(
    <ThemeProvider>
      <ThemeMenu />
    </ThemeProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Theme" }));
}

describe("ThemeMenu", () => {
  it("offers exactly the four accents and no more", async () => {
    // Every one is a theme somebody might actually want; a longer list is
    // a paint chart rather than a setting.
    await openMenu();

    const menu = screen.getByRole("menu");
    const accents = ["Neutral", "Blue", "Green", "Orange"];
    for (const name of accents) {
      expect(screen.getByRole("menuitem", { name: new RegExp(name) })).toBeInTheDocument();
    }
    // Four accents plus the three light-and-dark choices.
    expect(menu.querySelectorAll('[role="menuitem"]')).toHaveLength(accents.length + 3);
  });

  it("offers both axes, because they are one decision to a reader", async () => {
    await openMenu();

    expect(screen.getByText("Accent")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
  });

  it("names every colour as well as showing it", async () => {
    // A row of coloured circles is unusable to anybody who cannot tell
    // them apart.
    await openMenu();

    for (const name of ["Neutral", "Blue", "Green", "Orange"]) {
      expect(screen.getByRole("menuitem", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("paints the application in the accent chosen", async () => {
    await openMenu();

    await userEvent.click(screen.getByRole("menuitem", { name: /Orange/ }));

    expect(document.documentElement).toHaveAttribute("data-accent", "orange");
  });

  it("marks the neutral accent by the absence of an attribute", async () => {
    // It is the stylesheet's own defaults; a rule saying so would restate
    // what is already true.
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: /Orange/ }));
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    await userEvent.click(screen.getByRole("menuitem", { name: /Neutral/ }));

    expect(document.documentElement).not.toHaveAttribute("data-accent");
  });

  it("switches light and dark without disturbing the accent", async () => {
    // The two answer different questions, so changing one must not reset
    // the other.
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: /Orange/ }));
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    await userEvent.click(screen.getByRole("menuitem", { name: /Dark/ }));

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-accent", "orange");
  });

  it("remembers both choices across a visit", async () => {
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: /Green/ }));
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Light/ }));

    expect(window.localStorage.getItem("artha-accent")).toBe("green");
    expect(window.localStorage.getItem("artha-theme")).toBe("light");
  });

  it("says which choices are in force", async () => {
    await openMenu();

    expect(screen.getByRole("menuitem", { name: /Neutral/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: /System/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });
});
