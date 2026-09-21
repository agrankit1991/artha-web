/** Tests for the dialog. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("says what it is, takes focus, and closes on Escape, the backdrop and the cross", async () => {
    const onClose = vi.fn();
    render(
      <>
        <button type="button">Opener</button>
        <Dialog open onClose={onClose} title="New list" description="Give it a name.">
          <input aria-label="Name" />
        </Dialog>
      </>,
    );

    const dialog = screen.getByRole("dialog", { name: "New list" });
    expect(dialog).toHaveAccessibleDescription("Give it a name.");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId("dialog-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
    // A click inside the panel is not a click on the backdrop.
    await userEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("renders nothing while closed, and gives focus back when it closes", () => {
    const { rerender } = render(
      <>
        <button type="button">Opener</button>
        <Dialog open={false} onClose={vi.fn()} title="New list">
          <p>Body</p>
        </Dialog>
      </>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    screen.getByRole("button", { name: "Opener" }).focus();
    rerender(
      <>
        <button type="button">Opener</button>
        <Dialog
          open
          onClose={vi.fn()}
          title="New list"
          actions={<button type="button">Save</button>}
        >
          <p>Body</p>
        </Dialog>
      </>,
    );
    // Nothing to type into: the first real button takes focus, past the cross.
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();

    rerender(
      <>
        <button type="button">Opener</button>
        <Dialog open={false} onClose={vi.fn()} title="New list">
          <p>Body</p>
        </Dialog>
      </>,
    );
    expect(screen.getByRole("button", { name: "Opener" })).toHaveFocus();
  });

  it("takes focus itself when there is nothing inside to focus", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Just words">
        <p>Nothing to press.</p>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Just words" })).toHaveFocus();
  });
});
