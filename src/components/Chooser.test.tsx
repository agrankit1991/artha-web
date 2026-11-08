/** Tests for the one segmented control, drawn as words or as icons. */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Columns2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Chooser } from "./Chooser";
import { renderPage } from "@/test/support";

describe("Chooser", () => {
  it("draws an option as its icon alone when asked, still named and titled by its label", async () => {
    const onChange = vi.fn();
    renderPage(
      <Chooser
        options={[
          { key: "two", label: "2 side by side", icon: Columns2 },
          { key: "plain", label: "Plain" },
        ]}
        chosen="plain"
        onChange={onChange}
        label="Charts"
        iconsOnly
      />,
    );

    const pictured = screen.getByRole("button", { name: "2 side by side" });
    expect(pictured).toHaveAttribute("title", "2 side by side");
    expect(pictured).not.toHaveTextContent("2 side by side");
    // An option with no icon keeps its words.
    expect(screen.getByRole("button", { name: "Plain" })).toHaveTextContent("Plain");

    await userEvent.click(pictured);
    expect(onChange).toHaveBeenCalledWith("two");
  });
});
