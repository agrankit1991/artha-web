/** Tests for the list beside the chart, and moving through it from the keyboard. */

import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ChartListPanel, type PanelRow } from "./ChartListPanel";
import { renderPage } from "@/test/support";

function row(symbol: string): PanelRow {
  return {
    instrument_key: `NSE_EQ|${symbol}`,
    symbol,
    name: `${symbol} Ltd`,
    close: "100",
    change_percent: "1.5",
  };
}

const ROWS = [row("AAA"), row("BBB"), row("CCC")];

type Choose = (instrumentKey: string) => void;

function show(active: string | null = "NSE_EQ|BBB"): ReturnType<typeof vi.fn<Choose>> {
  const onChoose = vi.fn<Choose>();
  renderPage(
    <>
      <input aria-label="Somewhere to type" />
      <ChartListPanel title="Swing" rows={ROWS} active={active} onChoose={onChoose} />
    </>,
  );
  return onChoose;
}

describe("ChartListPanel", () => {
  it("lists each company with its price and move, the charted one marked", async () => {
    const onChoose = show();

    expect(screen.getByRole("button", { name: /BBB/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /AAA/ })).not.toHaveAttribute("aria-current");
    await userEvent.click(screen.getByRole("button", { name: /CCC/ }));
    expect(onChoose).toHaveBeenCalledWith("NSE_EQ|CCC");
  });

  it("moves down with Down or Space and up with Up or Shift+Space", () => {
    const onChoose = show();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: " ", shiftKey: true });

    expect(onChoose.mock.calls.map((call) => call[0])).toEqual([
      "NSE_EQ|CCC",
      "NSE_EQ|CCC",
      "NSE_EQ|AAA",
      "NSE_EQ|AAA",
    ]);
  });

  it("stays put at either end, and starts from the top when nothing is charted", () => {
    const atEnd = show("NSE_EQ|CCC");
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(atEnd).not.toHaveBeenCalled();
  });

  it("leaves keys alone while typing, with a modifier held, or for other keys", () => {
    const onChoose = show();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Somewhere to type" }), {
      key: "ArrowDown",
    });
    fireEvent.keyDown(window, { key: "ArrowDown", ctrlKey: true });
    fireEvent.keyDown(window, { key: "ArrowDown", metaKey: true });
    fireEvent.keyDown(window, { key: "ArrowDown", altKey: true });
    fireEvent.keyDown(window, { key: "x" });

    expect(onChoose).not.toHaveBeenCalled();
  });

  it("says when the list is empty, and then ignores the keys", () => {
    const onChoose = vi.fn();
    renderPage(<ChartListPanel title="Empty" rows={[]} active={null} onChoose={onChoose} />);

    expect(screen.getByText("Nothing on this list yet.")).toBeVisible();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("charts the first row when moving down from nothing charted", () => {
    const onChoose = show(null);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(onChoose).toHaveBeenCalledWith("NSE_EQ|AAA");
  });

  it("opens the reader's lists in the companies' place, the keys standing down meanwhile", async () => {
    const onChoose = vi.fn<Choose>();
    // Choosing a list renames the panel, as the page does.
    function Choosing(): React.JSX.Element {
      const [title, setTitle] = useState("Swing");
      return (
        <ChartListPanel
          title={title}
          rows={ROWS}
          active="NSE_EQ|BBB"
          onChoose={onChoose}
          lists={
            <button
              type="button"
              onClick={() => {
                setTitle("Long term");
              }}
            >
              Long term
            </button>
          }
        />
      );
    }
    renderPage(<Choosing />);
    const opener = screen.getByRole("button", { name: "Swing, choose another list" });
    expect(opener).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(opener);
    expect(opener).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Your lists" })).toBeVisible();
    expect(screen.queryByRole("list", { name: "Swing" })).toBeNull();
    expect(screen.queryByText("Up / Down to move")).toBeNull();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(onChoose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("list", { name: "Swing" })).toBeVisible();

    await userEvent.click(opener);
    await userEvent.click(opener);
    expect(screen.queryByRole("region", { name: "Your lists" })).toBeNull();

    await userEvent.click(opener);
    await userEvent.click(screen.getByRole("button", { name: "Long term" }));
    expect(screen.queryByRole("region", { name: "Your lists" })).toBeNull();
    expect(screen.getByRole("button", { name: "Long term, choose another list" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
