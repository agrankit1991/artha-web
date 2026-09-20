/** Tests for the account menu. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { initialsOf, UserMenu } from "./UserMenu";
import { ACCOUNT } from "@/test/support";

describe("initialsOf", () => {
  it("takes the first and last initials of a full name", () => {
    expect(initialsOf("Ankit Agrawal")).toBe("AA");
  });

  it("takes one letter from a single name", () => {
    expect(initialsOf("Tester")).toBe("T");
  });

  it("skips the middle of a longer name", () => {
    expect(initialsOf("Ankit Kumar Agrawal")).toBe("AA");
  });

  it("shows a mark rather than an empty circle for an empty name", () => {
    // An empty circle reads as an interface that has lost the account.
    expect(initialsOf("   ")).toBe("—");
  });
});

describe("UserMenu", () => {
  it("shows who is signed in", () => {
    render(<UserMenu account={ACCOUNT} onOpenProfile={vi.fn()} onSignOut={vi.fn()} />);

    expect(screen.getByText("Tester")).toBeInTheDocument();
  });

  it("says the address behind the name, where there is room", async () => {
    render(<UserMenu account={ACCOUNT} onOpenProfile={vi.fn()} onSignOut={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Account" }));

    expect(screen.getByText("tester@example.com")).toBeInTheDocument();
  });

  it("opens the profile", async () => {
    const profile = vi.fn();
    render(<UserMenu account={ACCOUNT} onOpenProfile={profile} onSignOut={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Account" }));

    await userEvent.click(screen.getByRole("menuitem", { name: /Profile/ }));

    expect(profile).toHaveBeenCalled();
  });

  it("signs out", async () => {
    const out = vi.fn();
    render(<UserMenu account={ACCOUNT} onOpenProfile={vi.fn()} onSignOut={out} />);
    await userEvent.click(screen.getByRole("button", { name: "Account" }));

    await userEvent.click(screen.getByRole("menuitem", { name: /Sign out/ }));

    expect(out).toHaveBeenCalled();
  });
});
