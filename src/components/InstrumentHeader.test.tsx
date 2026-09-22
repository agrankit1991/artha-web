/** Tests for the top of an index's or a company's page. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { overview } from "@/test/support";

import { InstrumentHeader, monogram } from "./InstrumentHeader";

describe("InstrumentHeader", () => {
  it("shows the level with its move in points and per cent, and where it sits", () => {
    const base = overview();
    render(
      <InstrumentHeader
        name="Nifty 50"
        subline={<span>NSE</span>}
        overview={{ ...base, day: { ...base.day, change: "153.40", change_percent: "0.62" } }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Nifty 50" })).toBeInTheDocument();
    expect(screen.getByText("+153.40")).toHaveClass("text-gain");
    expect(screen.getByText("+0.62%")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Day's range" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "52-week range" })).toBeInTheDocument();
    expect(screen.getByText(/As of/)).toBeInTheDocument();
  });

  it("colours a fall, and leaves an unknown move uncoloured", () => {
    const base = overview();
    const { rerender } = render(
      <InstrumentHeader
        name="Nifty 50"
        overview={{ ...base, day: { ...base.day, change: "-80.00", change_percent: "-0.30" } }}
      />,
    );
    expect(screen.getByText("-80.00")).toHaveClass("text-loss");

    rerender(
      <InstrumentHeader
        name="Nifty 50"
        overview={{ ...base, day: { ...base.day, change: null, change_percent: null } }}
      />,
    );
    expect(screen.getAllByText("—")[0]).toHaveClass("text-muted-foreground");
  });

  it("draws no price for something that does not trade, such as a sector", () => {
    render(<InstrumentHeader name="IT - Software" description="Software companies." />);

    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    expect(screen.getByText("Software companies.")).toBeInTheDocument();
  });
});

describe("monogram", () => {
  it("takes up to two initials, skipping punctuation", () => {
    expect(monogram("Nifty Bank")).toBe("NB");
    expect(monogram("IT - Software")).toBe("IS");
    expect(monogram("SENSEX")).toBe("S");
  });
});
