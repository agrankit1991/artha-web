/** Tests for a note set apart from the page. */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Callout } from "./Callout";

describe("Callout", () => {
  it("is a note unless it says more", () => {
    render(<Callout>History holds only the companies that survived.</Callout>);

    expect(screen.getByRole("note")).toHaveTextContent("companies that survived");
  });

  it("announces a failure, and says work under way is a status", () => {
    const { rerender } = render(<Callout tone="danger">The last run failed.</Callout>);
    expect(screen.getByRole("alert")).toHaveTextContent("The last run failed.");

    rerender(<Callout tone="progress">Queued.</Callout>);
    expect(screen.getByRole("status")).toHaveTextContent("Queued.");
  });

  it("takes the role it is given over the one its tone implies", () => {
    render(
      <Callout tone="caution" role="status">
        Signals are not in yet.
      </Callout>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("carries what can be done about it at the far end", () => {
    render(<Callout action={<button type="button">Restore</button>}>Changed.</Callout>);

    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });

  it("marks every tone with an icon, so none is said by colour alone", () => {
    for (const tone of ["info", "caution", "danger", "progress"] as const) {
      const { container, unmount } = render(<Callout tone={tone}>A note.</Callout>);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });
});
