/** Tests for one mover list, as a panel. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MoverPanelCard, titleOf } from "./MoverPanel";
import { moverRow, panel } from "@/test/support";

describe("MoverPanelCard", () => {
  it("names the list and the session it ranked", () => {
    render(<MoverPanelCard panel={panel()} />);

    expect(screen.getByText("Top gainers")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("heads the ranked column with what the list actually ranks", () => {
    // Each list ranks something different, and a column headed "Value"
    // would leave a reader working out which number put a company here.
    render(<MoverPanelCard panel={panel({ name: "unusual-volume" })} />);

    expect(screen.getByRole("button", { name: /vs average/ })).toBeInTheDocument();
  });

  it("renders the ranked figure in the units of its own list", () => {
    // A volume is not a percentage, and showing "12300000.00%" for the most
    // active is the kind of thing a shared column type invites.
    const { rerender } = render(
      <MoverPanelCard
        panel={panel({ name: "most-active", rows: [moverRow({ value: "12300000" })] })}
      />,
    );
    expect(screen.getByText("1.23 Cr")).toBeInTheDocument();

    rerender(
      <MoverPanelCard
        panel={panel({ name: "unusual-volume", rows: [moverRow({ value: "4.23" })] })}
      />,
    );
    expect(screen.getByText("4.2×")).toBeInTheDocument();

    rerender(
      <MoverPanelCard
        panel={panel({ name: "most-volatile", rows: [moverRow({ value: "6.4" })] })}
      />,
    );
    expect(screen.getByText("+6.40%")).toBeInTheDocument();
  });

  it("says how long each entry has been in the list", () => {
    // The half of a mover list that a single session cannot tell you.
    render(<MoverPanelCard panel={panel({ rows: [moverRow({ streak: 6 })] })} />);

    expect(screen.getByText("6d")).toHaveAttribute("title", "In this list for 6 sessions running");
  });

  it("shows both what an instrument is called and what it is", () => {
    render(<MoverPanelCard panel={panel()} />);

    expect(screen.getByText("RELIANCE")).toBeInTheDocument();
    expect(screen.getByText("Reliance Industries")).toBeInTheDocument();
  });

  it("says when a list has nothing in it", () => {
    render(<MoverPanelCard panel={panel({ rows: [], as_of: null })} />);

    expect(screen.getByText("Nothing in this list")).toBeInTheDocument();
    expect(screen.getByText("No session ranked yet")).toBeInTheDocument();
  });

  it("renders a figure for every list the platform serves", () => {
    // A list the interface cannot render would show an empty column on the
    // day the platform started returning it -- which is the day nobody is
    // looking at that panel.
    const names = [
      "top-gainers",
      "top-losers",
      "most-active",
      "most-volatile",
      "unusual-volume",
      "near-52wk-high",
      "near-52wk-low",
    ] as const;

    for (const name of names) {
      const { unmount } = render(<MoverPanelCard panel={panel({ name })} />);
      const cells = screen.getAllByRole("row")[1]?.querySelectorAll("td");
      expect(cells?.[2]?.textContent).not.toBe("");
      expect(titleOf(name)).not.toBe("");
      unmount();
    }
  });

  it("sorts on the figure rather than on how the figure is written", async () => {
    // Every column renders a formatted string, so sorting has to reach the
    // number behind it -- otherwise "1.23 Cr" sorts before "9,800" and a
    // column of prices orders alphabetically.
    render(
      <MoverPanelCard
        panel={panel({
          rows: [
            moverRow({ symbol: "TCS", close: "3420", value: "2.0", streak: 1, rank: 1 }),
            moverRow({ symbol: "INFY", close: "1502", value: "11.0", streak: 9, rank: 2 }),
          ],
        })}
      />,
    );

    const first = (): string | undefined =>
      screen.getAllByRole("row")[1]?.querySelectorAll("td")[0]?.textContent ?? undefined;

    await userEvent.click(screen.getByRole("button", { name: /Price/ }));
    expect(first()).toContain("TCS");

    await userEvent.click(screen.getByRole("button", { name: /Change/ }));
    expect(first()).toContain("INFY");

    await userEvent.click(screen.getByRole("button", { name: /Run/ }));
    expect(first()).toContain("INFY");

    // A name sorts A to Z first, where a figure sorts largest first. Both
    // are what a reader expects of that kind of column, and the difference
    // is the library's, so it is worth pinning.
    await userEvent.click(screen.getByRole("button", { name: /Symbol/ }));
    expect(first()).toContain("INFY");
  });

  it("titles every list in the catalogue", () => {
    // A list the platform serves and the interface cannot name would
    // render as an empty heading.
    expect(titleOf("near-52wk-high")).toBe("Near 52-week high");
    expect(titleOf("top-losers")).toBe("Top losers");
    expect(titleOf("near-52wk-low")).toBe("Near 52-week low");
  });

  it("sorts a list where an instrument has no snapshot yet", async () => {
    // An entry whose snapshot has not been rebuilt since its bars arrived
    // has no price. Sorting on that column must still order the rest,
    // rather than throwing or scattering them.
    render(
      <MoverPanelCard
        panel={panel({
          rows: [
            moverRow({ symbol: "NOSNAP", close: null }),
            moverRow({ symbol: "TCS", close: "4100.00" }),
          ],
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Price/ }));

    const [, firstRow] = screen.getAllByRole("row");
    expect(firstRow?.textContent).toContain("TCS");
  });
});
