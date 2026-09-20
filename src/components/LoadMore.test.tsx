/** Tests for the load-more control. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoadMore } from "./LoadMore";

describe("LoadMore", () => {
  it("says how much is on screen and how much there is", () => {
    render(<LoadMore shown={12} total={92} onMore={vi.fn()} />);

    expect(screen.getByText("Showing 12 of 92 articles")).toBeInTheDocument();
  });

  it("says how many more a press would bring", () => {
    // "Load more" alone gives no sense of whether that is five or five
    // hundred.
    render(<LoadMore shown={12} total={92} onMore={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Load more (80 left)" })).toBeInTheDocument();
  });

  it("asks for more when pressed", async () => {
    const more = vi.fn();
    render(<LoadMore shown={12} total={92} onMore={more} />);

    await userEvent.click(screen.getByRole("button"));

    expect(more).toHaveBeenCalled();
  });

  it("stops offering more once everything is shown", () => {
    render(<LoadMore shown={92} total={92} onMore={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("All 92 articles shown")).toBeInTheDocument();
  });

  it("will not ask twice while a batch is on its way", () => {
    render(<LoadMore shown={12} total={92} loading onMore={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });

  it("counts whatever it is given, not only articles", () => {
    render(<LoadMore shown={5} total={40} noun="companies" onMore={vi.fn()} />);

    expect(screen.getByText("Showing 5 of 40 companies")).toBeInTheDocument();
  });

  it("draws nothing when there is nothing to count", () => {
    const { container } = render(<LoadMore shown={0} total={0} onMore={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
