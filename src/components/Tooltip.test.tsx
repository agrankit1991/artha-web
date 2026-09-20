/** Tests for showing the rest of something cut short. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tooltip } from "./Tooltip";

const FULL = "Crude eased overnight and the refiners opened strongly on the back of it.";

function show(): void {
  render(
    <Tooltip content={FULL}>
      <span className="line-clamp-2">{FULL}</span>
    </Tooltip>,
  );
}

describe("Tooltip", () => {
  it("stays out of the way until somebody looks", () => {
    show();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the whole text on hover", async () => {
    show();

    await userEvent.hover(screen.getByText(FULL));

    expect(screen.getByRole("tooltip")).toHaveTextContent(FULL);
  });

  it("takes it away again on leaving", async () => {
    show();
    const target = screen.getByText(FULL);

    await userEvent.hover(target);
    await userEvent.unhover(target);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("can be read from the keyboard as well as the pointer", async () => {
    // A summary readable only by hovering cannot be read at all by
    // somebody tabbing through the page.
    show();

    await userEvent.tab();

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("names the bubble as the description of what it expands", async () => {
    const { container } = render(
      <Tooltip content={FULL}>
        <span className="line-clamp-2">Cut short</span>
      </Tooltip>,
    );

    await userEvent.tab();

    expect(container.firstChild).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
  });

  it("floats rather than taking part in the layout", async () => {
    // The whole point: the card must not grow and shove the grid around.
    show();

    await userEvent.tab();

    expect(screen.getByRole("tooltip")).toHaveClass("absolute");
  });
});
