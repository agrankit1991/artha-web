/** Tests for institutional flows at a glance. */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import type { InstitutionalFlow } from "@/api/client";

import { FlowsGlance } from "./FlowsGlance";

function flow(overrides: Partial<InstitutionalFlow>): InstitutionalFlow {
  return {
    participant: "FII",
    segment: "CASH",
    period: "DAY",
    day: "2026-09-22",
    buy_amount: "9845.81",
    sell_amount: "13655.80",
    net_amount: "-3809.99",
    buy_contracts: null,
    sell_contracts: null,
    oi_contracts: null,
    oi_amount: null,
    long_contracts: null,
    short_contracts: null,
    ...overrides,
  };
}

function draw(flows: InstitutionalFlow[] | null, loading = false): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <FlowsGlance flows={flows} loading={loading} />
    </MemoryRouter>,
  );
}

describe("FlowsGlance", () => {
  it("shows each side's latest net and its run, leading to the full page", () => {
    draw([
      flow({}),
      flow({ participant: "DII", net_amount: "4120.07" }),
      flow({ day: "2026-09-21", net_amount: "1000.00" }),
      // Only the cash market's sessions are drawn here.
      flow({ segment: "INDEX_FUTURES", net_amount: "-1903.18" }),
    ]);

    expect(screen.getByText("-3,809.99 Cr")).toHaveClass("text-loss");
    expect(screen.getByText("+4,120.07 Cr")).toHaveClass("text-gain");
    expect(
      screen.getByRole("img", { name: "FII net buying, last 2 sessions" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/1,903/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all →" })).toHaveAttribute("href", "/flows");
  });

  it("says when nothing has been captured yet", () => {
    draw([]);

    expect(screen.getAllByText("No session yet")).toHaveLength(2);
  });

  it("holds a place while the flows load", () => {
    const { container } = draw(null, true);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });
});
