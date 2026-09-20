/** Tests for the account page. */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Profile } from "./Profile";
import { ThemeProvider } from "@/lib/theme";
import { ACCOUNT } from "@/test/support";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-accent");
  document.documentElement.classList.remove("dark");
});

function show(onSignOut = vi.fn()): { left: typeof onSignOut } {
  render(
    <ThemeProvider>
      <Profile account={ACCOUNT} onSignOut={onSignOut} />
    </ThemeProvider>,
  );
  return { left: onSignOut };
}

describe("Profile", () => {
  it("shows what the platform holds about the sign-in", () => {
    show();

    expect(screen.getByRole("heading", { name: "Tester" })).toBeInTheDocument();
    expect(screen.getAllByText("tester@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("calls a non-owner a member rather than leaving the role blank", () => {
    render(
      <ThemeProvider>
        <Profile account={{ ...ACCOUNT, is_owner: false }} onSignOut={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("changes the accent from here as well as from the header", async () => {
    // One setting, reachable from either place, and both write the same
    // stored choice.
    show();

    await userEvent.click(
      within(screen.getByRole("group", { name: "Accent" })).getByRole("button", {
        name: /Blue/,
      }),
    );

    expect(document.documentElement).toHaveAttribute("data-accent", "blue");
    expect(window.localStorage.getItem("artha-accent")).toBe("blue");
  });

  it("changes light and dark from here too", async () => {
    show();

    await userEvent.click(
      within(screen.getByRole("group", { name: "Appearance" })).getByRole("button", {
        name: /Dark/,
      }),
    );

    expect(document.documentElement).toHaveClass("dark");
  });

  it("says what following the system currently means", async () => {
    // "System" alone does not tell a reader which one they are looking at.
    show();

    expect(
      screen.getByText(/Following this machine, which is currently light/),
    ).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole("group", { name: "Appearance" })).getByRole("button", {
        name: /Dark/,
      }),
    );

    expect(screen.getByText(/Fixed to dark/)).toBeInTheDocument();
  });

  it("is honest that the appearance is remembered by the browser", () => {
    // Somebody who set it here and found it reset on another machine would
    // reasonably call that a bug.
    show();

    expect(screen.getByText(/Remembered in this browser, not on the account/)).toBeInTheDocument();
  });

  it("ends the session from here", async () => {
    const { left } = show();

    await userEvent.click(screen.getByRole("button", { name: /Sign out/ }));

    expect(left).toHaveBeenCalled();
  });
});
