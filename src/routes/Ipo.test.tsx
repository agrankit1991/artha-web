/** Tests for one offering's own page. */

import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Ipo } from "./Ipo";
import { offering, renderPage, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Ipo", () => {
  it("shows the offering and where it stands in its dates", async () => {
    // Read on the 16th: bidding has closed, allotment is today, listing
    // is ahead.
    stubPlatform({ "/api/ipos": { body: [offering()] } });

    renderPage(<Ipo ipoId="veegaland-developers-limited-ipo" today={new Date(2026, 8, 16)} />);

    expect(await screen.findByRole("heading", { name: /Veegaland/ })).toBeInTheDocument();
    const timeline = screen.getByRole("list", { name: "Timeline" });
    const steps = within(timeline).getAllByRole("listitem");
    expect(steps[2]).toHaveAttribute("aria-current", "date");
    expect(steps[2]).toHaveTextContent("Allotment finalised");
  });

  it("says a date is not yet published rather than leaving a gap", async () => {
    stubPlatform({ "/api/ipos": { body: [offering({ refund_initiation: null })] } });

    renderPage(<Ipo ipoId="veegaland-developers-limited-ipo" today={new Date(2026, 8, 16)} />);

    await screen.findByRole("heading", { name: /Veegaland/ });
    expect(screen.getByText("Not yet published")).toBeInTheDocument();
  });

  it("says when there is no such offering", async () => {
    stubPlatform({ "/api/ipos": { body: [offering()] } });

    renderPage(<Ipo ipoId="nothing-here" />);

    expect(await screen.findByText("No such offering")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({ "/api/ipos": { status: 500, body: { detail: "the feed is down" } } });

    renderPage(<Ipo ipoId="x" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("the feed is down");
  });
});
