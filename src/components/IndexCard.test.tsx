/** Tests for one index, as a card. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IndexCard } from "./IndexCard";
import { overview } from "@/test/support";

describe("IndexCard", () => {
  it("shows where an index closed and how it moved", () => {
    render(<IndexCard name="Nifty 50" overview={overview()} />);

    expect(screen.getByText("Nifty 50")).toBeInTheDocument();
    expect(screen.getByText("24,812.40")).toBeInTheDocument();
    expect(screen.getByText(/\+0.62%/)).toBeInTheDocument();
  });

  it("holds its shape while the figures are on their way", () => {
    // Cards that appear one by one make the whole page jump as it loads.
    render(<IndexCard name="Sensex" overview={undefined} />);

    expect(screen.getByText("Sensex")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
