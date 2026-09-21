/** Tests for the page furniture every screen is built from. */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Empty } from "./Empty";
import { FactList } from "./FactList";
import { Failed } from "./Failed";
import { PageHeader } from "./PageHeader";
import { RangeMeter } from "./RangeMeter";
import { SectionHeader } from "./SectionHeader";
import { StatGrid, StatTile } from "./StatTile";
import { ENTITIES } from "@/lib/entities";

describe("PageHeader", () => {
  it("leads with the kind of thing the page is about", () => {
    // A reader arriving from a search result should know at a glance that
    // they landed on a company and not an index of the same name.
    const { container } = render(<PageHeader kind="company" title="Reliance Industries" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reliance Industries");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("carries identifiers, badges, actions and a description in their places", () => {
    render(
      <PageHeader
        title="Nifty 50"
        identifiers={<span>50 companies</span>}
        badges={<span>Broad market</span>}
        actions={<button type="button">Watch</button>}
        description="The fifty largest."
      />,
    );

    expect(screen.getByText("50 companies")).toBeInTheDocument();
    expect(screen.getByText("Broad market")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Watch" })).toBeInTheDocument();
    expect(screen.getByText("The fifty largest.")).toBeInTheDocument();
  });

  it("says nothing where the publisher said nothing", () => {
    // An empty description is not a description, and an empty paragraph
    // still takes up the room one would.
    render(<PageHeader title="Untitled" description="" />);

    expect(screen.queryByText("", { selector: "p" })).not.toBeInTheDocument();
  });
});

describe("SectionHeader", () => {
  it("names the section and what changes it", () => {
    render(
      <SectionHeader
        id="s"
        icon={ENTITIES.index.icon}
        title="Price & Performance"
        description="Against the market."
        actions={<button type="button">1Y</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute("id", "s");
    expect(screen.getByText("Against the market.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1Y" })).toBeInTheDocument();
  });
});

describe("StatTile", () => {
  it("states the figure, its change and what qualifies it", () => {
    render(
      <StatGrid>
        <StatTile label="Close" value="1,294.90" delta="8.25" hint="18 Sep 2026" />
      </StatGrid>,
    );

    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByText("1,294.90")).toBeInTheDocument();
    expect(screen.getByText("+8.25%")).toBeInTheDocument();
    expect(screen.getByText("18 Sep 2026")).toBeInTheDocument();
  });

  it("shows no change where none was given", () => {
    render(<StatTile label="Lot" value="107" delta={null} />);

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

describe("FactList", () => {
  it("dashes a fact that was not published", () => {
    render(
      <FactList
        columns={2}
        facts={[
          { label: "ISIN", value: "INE002A01018" },
          { label: "Reinvestment ISIN", value: null },
          { label: "Website", value: "" },
        ]}
      />,
    );

    expect(screen.getByText("INE002A01018")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});

describe("RangeMeter", () => {
  const rupees = (value: number): string => value.toFixed(2);

  it("places the value between the ends", () => {
    render(<RangeMeter label="Day range" low={100} high={200} value={150} format={rupees} />);

    const meter = screen.getByRole("meter", { name: "Day range" });
    expect(meter).toHaveAttribute("aria-valuenow", "150");
    expect(within(meter).getByText("", { selector: "span" })).toHaveStyle({ left: "50%" });
    expect(screen.getByText("100.00")).toBeInTheDocument();
    expect(screen.getByText("200.00")).toBeInTheDocument();
  });

  it("keeps a value outside the range on the bar", () => {
    // A close above the year's high on the day it made one sits at the
    // end rather than off the edge.
    render(<RangeMeter label="Year" low={100} high={200} value={230} format={rupees} />);

    const meter = screen.getByRole("meter", { name: "Year" });
    expect(within(meter).getByText("", { selector: "span" })).toHaveStyle({ left: "100%" });
  });

  it("dashes a value it does not have", () => {
    render(<RangeMeter label="Year" low={100} high={null} value={null} format={rupees} />);

    expect(screen.getByRole("meter", { name: "Year" }).querySelector("span")).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("draws no marker when an end is unknown", () => {
    render(<RangeMeter label="Year" low={null} high={200} value={150} format={rupees} />);

    const meter = screen.getByRole("meter", { name: "Year" });
    expect(meter.querySelector("span")).toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("Empty and Failed", () => {
  it("says what would be here and why it is not", () => {
    render(<Empty title="No five-year record" reason="This scheme launched in 2023." />);

    expect(screen.getByRole("status")).toHaveTextContent("No five-year record");
    expect(screen.getByText("This scheme launched in 2023.")).toBeInTheDocument();
  });

  it("cannot be mistaken for an empty result", () => {
    render(<Failed message="the counts are being rebuilt" />);

    expect(screen.getByRole("alert")).toHaveTextContent("the counts are being rebuilt");
  });
});
