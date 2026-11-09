import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { renderPage } from "@/test/support";

function open(focusAction?: boolean): void {
  renderPage(
    <ConfirmDialog
      open
      title="Remove RELIANCE?"
      description="Its notes and levels go with it."
      action="Remove"
      onClose={vi.fn()}
      onConfirm={vi.fn(() => Promise.resolve())}
      {...(focusAction === undefined ? {} : { focusAction })}
    />,
  );
}

describe("ConfirmDialog's focus", () => {
  it("rests on Cancel, the safe choice, unless told otherwise", () => {
    open();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("rests on the action when a key has already said what was meant", () => {
    open(true);

    expect(screen.getByRole("button", { name: "Remove" })).toHaveFocus();
  });
});

describe("ConfirmDialog, refused", () => {
  it("says why the action failed, and stays open to try again", async () => {
    renderPage(
      <ConfirmDialog
        open
        title="Remove RELIANCE?"
        description="Its notes and levels go with it."
        action="Remove"
        onClose={vi.fn()}
        onConfirm={() => Promise.reject(new Error("the list is gone"))}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText(/the list is gone/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
