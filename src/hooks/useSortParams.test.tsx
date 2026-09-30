/** Tests for a table's sort kept in the address. */

import type { ColumnSort } from "@tanstack/react-table";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { renderPage } from "@/test/support";

import { useSortParams } from "./useSortParams";

/** The order a list opens in, when the address names none. */
const OPENING: ColumnSort = { id: "three_years", desc: true };

/** A table's sort, the address it writes, and three ways to change it. */
function Sorted({ fallback }: { fallback?: ColumnSort }): React.JSX.Element {
  const [sorting, setSorting] = useSortParams(fallback);
  const { search } = useLocation();
  return (
    <div>
      <output aria-label="Address">{search}</output>
      <output aria-label="Read">
        {sorting.map((one) => `${one.id} ${one.desc ? "desc" : "asc"}`).join()}
      </output>
      <button
        type="button"
        onClick={() => {
          setSorting([{ id: "one_year", desc: true }]);
        }}
      >
        One year
      </button>
      <button
        type="button"
        onClick={() => {
          setSorting((held) => (held[0]?.id === "three_years" ? held : [OPENING]));
        }}
      >
        Opening
      </button>
      <button
        type="button"
        onClick={() => {
          setSorting([]);
        }}
      >
        None
      </button>
    </div>
  );
}

describe("useSortParams", () => {
  it("reads no sort where the address names none and nothing opens the list", () => {
    renderPage(<Sorted />, { at: "/funds" });

    expect(screen.getByLabelText("Read")).toBeEmptyDOMElement();
  });

  it("opens on its fallback where the address names none", () => {
    renderPage(<Sorted fallback={OPENING} />, { at: "/funds" });
    expect(screen.getByLabelText("Read")).toHaveTextContent("three_years desc");
  });

  it("prefers the address to the fallback", () => {
    renderPage(<Sorted fallback={OPENING} />, { at: "/funds?sort=nav&order=asc" });

    expect(screen.getByLabelText("Read")).toHaveTextContent("nav asc");
  });

  it("writes another order, and leaves the address plain on the fallback again", async () => {
    renderPage(<Sorted fallback={OPENING} />, { at: "/funds?q=axis" });

    await userEvent.click(screen.getByRole("button", { name: "One year" }));
    expect(screen.getByLabelText("Address")).toHaveTextContent("?q=axis&sort=one_year&order=desc");

    await userEvent.click(screen.getByRole("button", { name: "Opening" }));
    expect(screen.getByLabelText("Address")).toHaveTextContent(/^\?q=axis$/);
    expect(screen.getByLabelText("Read")).toHaveTextContent("three_years desc");
  });

  it("clears the order when none is chosen", async () => {
    renderPage(<Sorted />, { at: "/funds?sort=nav&order=desc" });

    await userEvent.click(screen.getByRole("button", { name: "None" }));

    expect(screen.getByLabelText("Address")).toBeEmptyDOMElement();
  });
});
