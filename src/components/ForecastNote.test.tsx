/** Tests for the words under a forecast band. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ForecastNote } from "./ForecastNote";
import { bandRecord, priceBands } from "@/test/support";

function note(): string {
  return screen.getByTestId("forecast-note").textContent;
}

describe("ForecastNote", () => {
  it("states the range, the model and how often the price stayed inside", () => {
    render(<ForecastNote bands={priceBands()} />);

    expect(note()).toMatch(/in 20 sessions, by 8 Oct/);
    expect(note()).toContain("80% range");
    expect(note()).toContain("each stock's own volatility (no AI)");
    expect(note()).toContain("from 2012, the price ended inside the band 79% of the time");
    expect(note()).toContain("drawn flat at the last close");
  });

  it("credits a middle line that beat no change, with both misses", () => {
    render(
      <ForecastNote
        bands={priceBands({ records: [bandRecord({ median_error: 7.94, zero_error: 8.1 })] })}
      />,
    );

    expect(note()).toContain("missed by 7.9% on average, against 8.1% for assuming no change");
  });

  it("leaves out a date it cannot place, and a record it does not have", () => {
    const bands = priceBands({
      points: [{ horizon: 20, session: null, low: "90", median: "101", high: "112" }],
      records: [],
    });

    render(<ForecastNote bands={bands} />);

    expect(note()).toContain("in 20 sessions, the price");
    expect(note()).not.toContain("Tested");
  });

  it("says nothing of a range when there is no point", () => {
    render(<ForecastNote bands={priceBands({ points: [] })} />);

    expect(note()).not.toContain("80% range");
  });
});
