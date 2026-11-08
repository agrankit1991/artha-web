/** Tests for the menu primitive. */

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContextMenu, Menu, MenuItem, MenuLabel, MenuSeparator } from "./Menu";

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

describe("ContextMenu", () => {
  function openAt(at: { x: number; y: number } | null): { closed: ReturnType<typeof vi.fn> } {
    const closed = vi.fn();
    render(
      <div>
        <button type="button">Outside</button>
        <ContextMenu at={at} label="RELIANCE, on your watchlists" onClose={closed}>
          {(close) => (
            <>
              <MenuItem onSelect={close}>Long term</MenuItem>
              <MenuItem onSelect={vi.fn()}>Swing</MenuItem>
            </>
          )}
        </ContextMenu>
      </div>,
    );
    return { closed };
  }

  it("opens where it is asked, over everything, its first choice taking the keyboard", () => {
    openAt({ x: 120, y: 80 });
    const menu = screen.getByRole("menu", { name: "RELIANCE, on your watchlists" });
    expect(menu).toHaveStyle({ position: "fixed", left: "120px", top: "80px" });
    expect(menu.parentElement).toBe(document.body);
    expect(screen.getByRole("menuitem", { name: "Long term" })).toHaveFocus();
  });

  it("is nothing while shut", () => {
    openAt(null);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("stays inside the window, turned above the pointer near its foot", () => {
    const measured = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ width: 200, height: 150 } as DOMRect);
    openAt({ x: window.innerWidth - 50, y: window.innerHeight - 20 });
    const menu = screen.getByRole("menu");
    expect(menu).toHaveStyle({
      left: `${String(window.innerWidth - 200 - 8)}px`,
      top: `${String(window.innerHeight - 20 - 150)}px`,
    });
    measured.mockRestore();
  });

  it("closes on a choice, Escape, a click or a scroll elsewhere, and a resize", async () => {
    const { closed } = openAt({ x: 10, y: 10 });

    await userEvent.click(screen.getByRole("menuitem", { name: "Long term" }));
    expect(closed).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    expect(closed).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("button", { name: "Outside" }));
    expect(closed).toHaveBeenCalledTimes(3);
    fireEvent.scroll(window);
    expect(closed).toHaveBeenCalledTimes(4);
    fireEvent(window, new Event("resize"));
    expect(closed).toHaveBeenCalledTimes(5);

    // Scrolling its own choices keeps it.
    fireEvent.scroll(screen.getByRole("menu"));
    expect(closed).toHaveBeenCalledTimes(5);
  });
});
