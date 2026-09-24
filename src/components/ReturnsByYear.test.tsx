/** Tests for the strategies' returns by year. */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { STRATEGY_SCANS, scanPath } from "@/lib/scans";
import { renderPage } from "@/test/support";

import { ReturnsByYear } from "./ReturnsByYear";

// The table is six rows by twenty-three columns, and a role query with a
// name computes the accessible name of every cell it passes; under the
// whole suite's load that alone ran past the time limit. Rows are found by
// the id printed in them, and cells read by position, instead.

/** The table. */
function table(): HTMLElement {
  return screen.getByRole("table", { name: "Returns by year" });
}

/** The cells of the row carrying a lab id, or `the market`: the name, then 2026 down. */
function cellsOf(marker: string): HTMLElement[] {
  const row = within(table()).getByText(marker).closest("tr");
  if (row === null) {
    throw new Error(`no row for ${marker}`);
  }
  return [...row.querySelectorAll("td")];
}

/** A row's cell for one year. */
function yearCell(cells: HTMLElement[], year: number): HTMLElement {
  const cell = cells[1 + 2026 - year];
  if (cell === undefined) {
    throw new Error(`no cell for ${String(year)}`);
  }
  return cell;
}

/** What each body row is called, top to bottom. */
function rowOrder(): string[] {
  return [...table().querySelectorAll("tbody tr")].map(
    (row) => row.querySelector("td")?.textContent ?? "",
  );
}

describe("ReturnsByYear", () => {
  it("shows every strategy and the market by year, newest first, the running year labelled", () => {
    renderPage(<ReturnsByYear scans={STRATEGY_SCANS} />);

    const headers = [...table().querySelectorAll("th")].map((header) => header.textContent);
    expect(headers[0]).toBe("Strategy");
    expect(headers[1]).toMatch(/^2026to 21 Sept?$/);
    expect(headers[2]).toBe("2025");
    expect(headers.at(-1)).toBe("2005");
    expect(headers).toHaveLength(23);
    expect(rowOrder()).toHaveLength(6);

    const nearHigh = cellsOf("S0010");
    expect(yearCell(nearHigh, 2025)).toHaveTextContent("+39.9%");
    expect(yearCell(nearHigh, 2026)).toHaveTextContent("-22.8%");
    expect(nearHigh[0]?.querySelector("a")).toHaveAttribute(
      "href",
      scanPath(STRATEGY_SCANS[0] as (typeof STRATEGY_SCANS)[number]),
    );
    const market = cellsOf("the market");
    expect(market[0]?.querySelector("a")).toHaveAttribute("href", "/index/nifty-500");
    expect(yearCell(market, 2026)).toHaveTextContent("-4.2%");
    // Why the running year splits the strategies.
    expect(
      screen.getByText(/market switch have held gold since 2 Mar 2026, while momentum stocks/),
    ).toBeInTheDocument();
  });

  it("marks the best strategy of each year, and never the market", () => {
    renderPage(<ReturnsByYear scans={STRATEGY_SCANS} />);

    expect(yearCell(cellsOf("S0012"), 2025)).toHaveTextContent("(best that year)");
    expect(yearCell(cellsOf("S0010"), 2025)).not.toHaveTextContent("(best that year)");
    expect(yearCell(cellsOf("S0003"), 2026)).toHaveTextContent("(best that year)");
    // The market beat every strategy in 2009, and is still not marked.
    expect(cellsOf("the market").some((cell) => cell.textContent.includes("best"))).toBe(false);
  });

  it("flags a first part-year, keeps it out of the contest, and dashes a year not tested", () => {
    renderPage(<ReturnsByYear scans={STRATEGY_SCANS} />);

    const delivery = cellsOf("S0012");
    expect(yearCell(delivery, 2019)).toHaveTextContent("+4.3%*(part of the year)");
    expect(yearCell(delivery, 2019)).not.toHaveTextContent("(best that year)");
    expect(yearCell(cellsOf("S0009"), 2019)).toHaveTextContent("(best that year)");
    expect(yearCell(delivery, 2018)).toHaveTextContent("—");
    expect(
      screen.getByText(/Part of the year: S0012 from Nov 2019, S0006 from Nov 2019/),
    ).toBeInTheDocument();
  });

  it("tints the running year and the last whole one, and ranks the rows by any year", async () => {
    renderPage(<ReturnsByYear scans={STRATEGY_SCANS} />);
    const headers = [...table().querySelectorAll("th")];
    expect(headers[1]).toHaveClass("text-primary");
    expect(headers[2]).toHaveClass("text-primary");
    expect(headers[3]).not.toHaveClass("text-primary");
    expect(yearCell(cellsOf("S0006"), 2025)).toHaveClass("bg-primary/5");

    await userEvent.click(headers[2]?.querySelector("button") as HTMLElement);
    expect(rowOrder()).toEqual([
      expect.stringContaining("S0012"),
      expect.stringContaining("S0010"),
      expect.stringContaining("S0009"),
      expect.stringContaining("S0006"),
      expect.stringContaining("the market"),
      expect.stringContaining("S0003"),
    ]);

    // A year some strategies were not tested in sorts them to the end.
    await userEvent.click(headers[1 + 2026 - 2018]?.querySelector("button") as HTMLElement);
    expect(rowOrder().slice(-2).join(" ")).toMatch(/S0012.*S0006|S0006.*S0012/);

    // And by name, which takes the market off the bottom row.
    await userEvent.click(headers[0]?.querySelector("button") as HTMLElement);
    expect(rowOrder().findIndex((name) => name.includes("the market"))).toBeLessThan(5);
  });

  it("names the best strategy of the last whole year and of this one, beside the market", () => {
    renderPage(<ReturnsByYear scans={STRATEGY_SCANS} />);

    const leaders = [
      ...screen.getByRole("list", { name: "Best of the recent years" }).querySelectorAll("li"),
    ].map((item) => item.textContent);
    expect(leaders).toHaveLength(2);
    expect(leaders[0]).toBe(
      "Best in 2025: Momentum among high-delivery stocks +42.5% against the Nifty 500's +6.7%",
    );
    expect(leaders[1]).toMatch(
      /^Best so far in 2026 \(to 21 Sept?\): Monthly momentum \(baseline\) \+42\.7% against the Nifty 500's -4\.2%$/,
    );
  });

  it("says nothing about part-years when no strategy started part-way through one", () => {
    renderPage(<ReturnsByYear scans={STRATEGY_SCANS.slice(0, 1)} />);

    expect(screen.queryByText(/Part of the year/)).not.toBeInTheDocument();
  });
});
