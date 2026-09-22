/** Tests for how much of what traded changed hands for good. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DeliveryCard } from "./DeliveryCard";

describe("DeliveryCard", () => {
  it("draws nothing for a company NSE publishes no delivery for", () => {
    const { container } = render(
      <DeliveryCard
        days={[
          // Trade-for-trade: traded, with no delivery figure published.
          {
            session_date: "2026-09-22",
            traded_quantity: 500,
            delivered_quantity: null,
            delivery_percent: null,
          },
        ]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("gives no ratio against an average of nothing delivered", () => {
    render(
      <DeliveryCard
        days={[
          {
            session_date: "2026-09-22",
            traded_quantity: 500,
            delivered_quantity: 0,
            delivery_percent: "0.00",
          },
        ]}
      />,
    );

    expect(screen.getByText("Latest against average").parentElement).toHaveTextContent("—");
    expect(
      screen.getByRole("img", { name: "Delivered share, last 1 sessions" }),
    ).toBeInTheDocument();
  });
});
