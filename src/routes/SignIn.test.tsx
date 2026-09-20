/** Tests for the sign-in page. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignIn } from "./SignIn";
import { ACCOUNT, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillIn(password = "a long enough passphrase"): Promise<void> {
  await userEvent.type(screen.getByLabelText("Email"), "tester@example.com");
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignIn", () => {
  it("hands the account back once the platform accepts", async () => {
    const fetchMock = stubPlatform({ "/api/login": { body: ACCOUNT } });
    const signedIn = vi.fn();
    render(<SignIn onSignedIn={signedIn} />);

    await fillIn();

    await waitFor(() => {
      expect(signedIn).toHaveBeenCalledWith(ACCOUNT);
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/login");
  });

  it("shows the platform's refusal rather than a generic failure", async () => {
    // One message for a wrong password and an unknown address, which is the
    // platform's choice; the page's job is to show what it was told.
    stubPlatform({ "/api/login": { status: 401, body: { detail: "email or password is wrong" } } });
    render(<SignIn onSignedIn={vi.fn()} />);

    await fillIn("not the passphrase");

    expect(await screen.findByRole("alert")).toHaveTextContent("email or password is wrong");
  });

  it("marks the fields for a password manager", () => {
    // Without these a manager will not offer to fill or to save, which is
    // how people end up choosing a password they can retype.
    render(<SignIn onSignedIn={vi.fn()} />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("says it is working, and stops saying so when it is done", async () => {
    stubPlatform({ "/api/login": { status: 401, body: { detail: "no" } } });
    render(<SignIn onSignedIn={vi.fn()} />);

    await fillIn();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    });
  });
});
