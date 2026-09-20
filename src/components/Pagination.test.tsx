/** Tests for the pagination control. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("says where in the whole the reader is", () => {
    render(<Pagination offset={12} limit={12} total={92} onChange={vi.fn()} />);

    expect(screen.getByText("13–24 of 92")).toBeInTheDocument();
  });

  it("marks the page being shown, for a screen reader as well", () => {
    render(<Pagination offset={12} limit={12} total={92} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });

  it("moves forward and back by one page", async () => {
    const changed = vi.fn();
    render(<Pagination offset={24} limit={12} total={92} onChange={changed} />);

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(changed).toHaveBeenLastCalledWith(36);

    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(changed).toHaveBeenLastCalledWith(12);
  });

  it("jumps to a page by number, reporting its offset", async () => {
    // The caller pages by offset because that is what the platform takes.
    const changed = vi.fn();
    render(<Pagination offset={0} limit={12} total={92} onChange={changed} />);

    await userEvent.click(screen.getByRole("button", { name: "Page 4" }));

    expect(changed).toHaveBeenCalledWith(36);
  });

  it("will not go back from the first page or on from the last", () => {
    const { rerender } = render(<Pagination offset={0} limit={12} total={92} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    rerender(<Pagination offset={84} limit={12} total={92} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("draws nothing at all when everything fits on one page", () => {
    // A control offering only the page already shown is noise.
    const { container } = render(<Pagination offset={0} limit={12} total={8} onChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
