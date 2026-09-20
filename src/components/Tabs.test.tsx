/** Tests for switching between views of the same thing. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Tabs } from "./Tabs";

const TABS = [
  { key: "gold", label: "Nifty 50 vs Gold" },
  { key: "price", label: "Nifty 50" },
];

function show(
  active = "gold",
  props: Partial<Parameters<typeof Tabs>[0]> = {},
): ReturnType<typeof vi.fn> {
  const changed = vi.fn();
  render(
    <Tabs tabs={TABS} active={active} onChange={changed} label="Chart" {...props}>
      <p>{active === "gold" ? "The comparison" : "The price"}</p>
    </Tabs>,
  );
  return changed;
}

describe("Tabs", () => {
  it("says which view is showing", () => {
    show();

    expect(screen.getByRole("tab", { name: "Nifty 50 vs Gold" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Nifty 50" })).toHaveAttribute("aria-selected", "false");
  });

  it("names the panel after the tab that opened it", () => {
    show();

    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAccessibleName("Nifty 50 vs Gold");
    expect(panel).toHaveTextContent("The comparison");
  });

  it("reports the view that was chosen", async () => {
    const changed = show();

    await userEvent.click(screen.getByRole("tab", { name: "Nifty 50" }));

    expect(changed).toHaveBeenCalledWith("price");
  });

  it("keeps only the chosen tab in the tab order", async () => {
    // A strip that put every tab in it would swallow the keyboard on the
    // way down the page.
    show();

    await userEvent.tab();

    expect(screen.getByRole("tab", { name: "Nifty 50 vs Gold" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Nifty 50" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves between views with the arrow keys", async () => {
    const changed = show();
    await userEvent.tab();

    await userEvent.keyboard("{ArrowRight}");

    expect(changed).toHaveBeenCalledWith("price");
  });

  it("wraps round rather than stopping at the end", async () => {
    // The end of a strip of tabs is not a wall.
    const changed = show("price");
    await userEvent.tab();

    await userEvent.keyboard("{ArrowRight}");

    expect(changed).toHaveBeenCalledWith("gold");
  });

  it("goes the other way on the left arrow", async () => {
    const changed = show();
    await userEvent.tab();

    await userEvent.keyboard("{ArrowLeft}");

    expect(changed).toHaveBeenCalledWith("price");
  });

  it("leaves other keys alone", async () => {
    const changed = show();
    await userEvent.tab();

    await userEvent.keyboard("{ArrowDown}");

    expect(changed).not.toHaveBeenCalled();
  });

  it("shows whatever belongs at the far end of the strip", () => {
    show("gold", { aside: <span>A range</span> });

    expect(screen.getByText("A range")).toBeInTheDocument();
  });

  it("leaves the panel unnamed rather than pointing at a tab that is not there", () => {
    show("nothing-like-this");

    expect(screen.getByRole("tabpanel")).not.toHaveAccessibleName();
  });
});
