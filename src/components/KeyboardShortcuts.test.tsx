/** Tests for moving around without the mouse. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { KeyboardShortcuts } from "./KeyboardShortcuts";

function Where(): React.JSX.Element {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function draw(): void {
  render(
    <MemoryRouter>
      <KeyboardShortcuts />
      <input aria-label="A field" />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("KeyboardShortcuts", () => {
  it("jumps to a page on g then its letter", async () => {
    draw();

    await userEvent.keyboard("gi");
    expect(screen.getByTestId("where")).toHaveTextContent("/indices");

    await userEvent.keyboard("gf");
    expect(screen.getByTestId("where")).toHaveTextContent("/flows");

    // A letter with no page does nothing, and a letter alone is not a jump.
    await userEvent.keyboard("gzs");
    expect(screen.getByTestId("where")).toHaveTextContent("/flows");
  });

  it("forgets a g left too long before the letter", async () => {
    const now = vi.spyOn(Date, "now");
    draw();

    now.mockReturnValue(1000);
    await userEvent.keyboard("g");
    now.mockReturnValue(5000);
    await userEvent.keyboard("s");

    expect(screen.getByTestId("where")).toHaveTextContent("/");
    now.mockRestore();
  });

  it("lists every shortcut on ?", async () => {
    draw();

    await userEvent.keyboard("?");

    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toHaveTextContent(
      "Watchlists",
    );
  });

  it("leaves the keys alone while the reader is typing", async () => {
    draw();

    await userEvent.type(screen.getByRole("textbox", { name: "A field" }), "gi?");

    expect(screen.getByTestId("where")).toHaveTextContent("/");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
