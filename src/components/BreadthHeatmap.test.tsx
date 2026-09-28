/** Tests for participation over time, as a grid. */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatDay } from "@/lib/format";

import { BreadthHeatmap, type HeatmapRow } from "./BreadthHeatmap";

function draw(props: Partial<Parameters<typeof BreadthHeatmap>[0]> = {}): void {
  render(
    <MemoryRouter>
      <BreadthHeatmap
        days={["2026-09-21", "2026-09-22"]}
        rows={[]}
        measureLabel="50-day"
        {...props}
      />
    </MemoryRouter>,
  );
}

/** Weekdays back from a Friday, oldest first, as a run of sessions. */
function sessions(count: number): string[] {
  const days: string[] = [];
  const date = new Date("2026-09-25T00:00:00Z");
  while (days.length < count) {
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
      days.unshift(date.toISOString().slice(0, 10));
    }
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return days;
}

/** One population at 50% on every session. */
function level(days: readonly string[]): HeatmapRow {
  return { key: "nifty", label: "Nifty 50", href: null, shares: days.map(() => 50) };
}

/** Every cell of a population's row, the gaps that stand in for unbuilt sessions included. */
function cellsOf(label: string): HTMLTableCellElement[] {
  const row = screen.getByRole("rowheader", { name: label }).closest("tr") as HTMLElement;
  return [...row.querySelectorAll("td")];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BreadthHeatmap", () => {
  it("colours each session by its share, and says it in words", () => {
    draw({
      rows: [
        { key: "nifty", label: "Nifty 50", href: "/index/nifty-50", shares: [12, 85] },
        // Not counted on the 21st.
        { key: "bank", label: "Bank Nifty", href: "/index/nifty-bank", shares: [null, 50] },
        // A population with nothing counted, like India VIX, is left out.
        { key: "vix", label: "India VIX", href: "/index/india-vix", shares: [null, null] },
        // The whole market has no page of its own.
        { key: "market", label: "All companies", href: null, shares: [40, 41] },
      ],
    });

    const table = screen.getByRole("table", { name: "Share above the 50-day average" });
    expect(within(table).getByRole("link", { name: "Nifty 50" })).toHaveAttribute(
      "href",
      "/index/nifty-50",
    );
    expect(within(table).queryByText("India VIX")).not.toBeInTheDocument();
    expect(
      within(within(table).getByRole("rowheader", { name: "All companies" })).queryByRole("link"),
    ).not.toBeInTheDocument();
    expect(
      within(table).getByLabelText(/Nifty 50, 21 Sept? 2026: 12% above the 50-day average/),
    ).toHaveClass("bg-loss/80");
    expect(
      within(table).getByLabelText(/Nifty 50, 22 Sept? 2026: 85% above the 50-day average/),
    ).toHaveClass("bg-gain/80");
    expect(within(table).getByLabelText(/Bank Nifty, 22 Sept? 2026: 50%/)).toHaveClass(
      "bg-caution/45",
    );
    expect(within(table).getByLabelText(/Bank Nifty, 21 Sept? 2026: not counted/)).toHaveClass(
      "bg-muted",
    );
    expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent("80% and over");
  });

  it("names every tenth session along the top, with its year when the span asks", () => {
    const days = sessions(21);

    draw({ days, rows: [level(days)], yearly: true });

    const named = within(screen.getByRole("table"))
      .getAllByRole("columnheader")
      .filter((header) => header.textContent !== "");
    // Sessions 0, 10 and 20 of the run, oldest first.
    expect(named).toHaveLength(3);
    expect(named[0]).toHaveTextContent(/^\d{1,2} \w{3,4} 2026$/);
  });

  it("builds only the sessions in view, standing the rest in as one gap", () => {
    const days = sessions(500);

    draw({ days, rows: [level(days)] });

    // jsdom's window is 1,024px: 74 fourteen-pixel sessions and twenty spare
    // to the right, then one gap as wide as the 405 left unbuilt and theirs.
    const cells = cellsOf("Nifty 50");
    expect(cells).toHaveLength(96);
    expect(cells[cells.length - 1]).toHaveStyle({ width: `${String(405 * 14 - 2)}px` });
  });

  it("builds the sessions it is scrolled to", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const days = sessions(500);
    draw({ days, rows: [level(days)] });
    const box = screen.getByRole("table").parentElement as HTMLElement;

    Object.defineProperty(box, "scrollLeft", { value: 3500, configurable: true });
    fireEvent.scroll(box);

    // 3,500px is session 250; the build starts twenty sessions before it.
    const [gap, first] = cellsOf("Nifty 50");
    expect(gap).toHaveStyle({ width: `${String(230 * 14 - 2)}px` });
    expect(first).toHaveAccessibleName(
      `Nifty 50, ${formatDay(days[230])}: 50% above the 50-day average`,
    );
  });

  it("dims the grid while a new span loads over it", () => {
    draw({ rows: [level(["2026-09-21", "2026-09-22"])], loading: true });

    expect(screen.getByRole("table").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  it("holds a place while the first rows load", () => {
    const { container } = render(
      <MemoryRouter>
        <BreadthHeatmap days={[]} rows={[]} measureLabel="20-day" loading />
      </MemoryRouter>,
    );

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
