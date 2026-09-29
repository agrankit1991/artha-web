/** Tests for one piece of page state kept in the address. */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { renderPage } from "@/test/support";

import { useSearchParam } from "./useSearchParam";

/** Two filters and the address they write. */
function Filters(): React.JSX.Element {
  const [kind, setKind] = useSearchParam("kind", "ALL");
  const [words, setWords] = useSearchParam("q");
  const { search } = useLocation();
  return (
    <div>
      <output aria-label="Address">{search}</output>
      <output aria-label="Read">{`${kind}/${words}`}</output>
      <button
        type="button"
        onClick={() => {
          setWords("tata");
        }}
      >
        Words
      </button>
      <button
        type="button"
        onClick={() => {
          setKind("ALL");
        }}
      >
        Default
      </button>
    </div>
  );
}

describe("useSearchParam", () => {
  it("reads the address, and its fallback where the address says nothing", () => {
    renderPage(<Filters />, { at: "/deals?kind=BLOCK" });

    expect(screen.getByLabelText("Read")).toHaveTextContent("BLOCK/");
  });

  it("writes a value beside the others already in the address", async () => {
    renderPage(<Filters />, { at: "/deals?kind=BULK" });

    await userEvent.click(screen.getByRole("button", { name: "Words" }));

    expect(screen.getByLabelText("Address")).toHaveTextContent("?kind=BULK&q=tata");
    expect(screen.getByLabelText("Read")).toHaveTextContent("BULK/tata");
  });

  it("leaves a value at its default out of the address", async () => {
    renderPage(<Filters />, { at: "/deals?kind=BULK&q=tata" });

    await userEvent.click(screen.getByRole("button", { name: "Default" }));

    expect(screen.getByLabelText("Address")).toHaveTextContent("?q=tata");
  });
});
