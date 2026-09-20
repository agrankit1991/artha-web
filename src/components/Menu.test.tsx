/** Tests for the menu primitive. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./Menu";

function open(onSelect = vi.fn()): { chosen: typeof onSelect } {
  render(
    <div>
      <button type="button">Outside</button>
      <Menu label="Theme" trigger={<span>Open</span>}>
        {(close) => (
          <>
            <MenuLabel>Accent</MenuLabel>
            <MenuItem selected onSelect={onSelect}>
              Blue
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onSelect={() => {
                close();
              }}
            >
              Green
            </MenuItem>
          </>
        )}
      </Menu>
    </div>,
  );
  return { chosen: onSelect };
}

describe("Menu", () => {
  it("keeps its choices shut until asked", () => {
    open();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Theme" })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on the trigger and says so", async () => {
    open();

    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    expect(screen.getByRole("menu", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Theme" })).toHaveAttribute("aria-expanded", "true");
  });

  it("closes again on the trigger", async () => {
    open();
    const trigger = screen.getByRole("button", { name: "Theme" });

    await userEvent.click(trigger);
    await userEvent.click(trigger);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("says which choice is in force, rather than only drawing it", async () => {
    // A tick is invisible to a screen reader.
    open();

    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    expect(screen.getByRole("menuitem", { name: "Blue" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("menuitem", { name: "Green" })).not.toHaveAttribute("aria-current");
  });

  it("reports the choice that was made", async () => {
    const { chosen } = open();
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    await userEvent.click(screen.getByRole("menuitem", { name: "Blue" }));

    expect(chosen).toHaveBeenCalled();
  });

  it("lets a choice close the menu behind it", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    await userEvent.click(screen.getByRole("menuitem", { name: "Green" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when something else is clicked", async () => {
    // A menu left open over the page is the most common way one of these
    // gets in the way.
    open();
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    await userEvent.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("stays open when something inside it is clicked", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));

    await userEvent.click(screen.getByText("Accent"));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
