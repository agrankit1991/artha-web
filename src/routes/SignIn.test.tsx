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

describe("SignIn with an invitation", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
    vi.unstubAllGlobals();
  });

  it("opens the sign-up form from an invitation link and spends the code", async () => {
    window.history.replaceState(null, "", "/?invite=abc123");
    const fetchMock = stubPlatform({ "/api/register": { status: 201, body: ACCOUNT } });
    const onSignedIn = vi.fn();
    render(<SignIn onSignedIn={onSignedIn} />);

    expect(screen.getByLabelText("Invitation code")).toHaveValue("abc123");
    await userEvent.type(screen.getByLabelText("Your name"), "Friend");
    await userEvent.type(screen.getByLabelText("Email"), "friend@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "a long enough passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledWith(ACCOUNT);
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      invitation: "abc123",
      email: "friend@example.com",
      display_name: "Friend",
      password: "a long enough passphrase",
    });
    expect(window.location.search).toBe("");
  });

  it("says a password is too short before asking the platform", async () => {
    const fetchMock = stubPlatform({});
    render(<SignIn onSignedIn={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Have an invitation/ }));
    await userEvent.type(screen.getByLabelText("Invitation code"), "abc");
    await userEvent.type(screen.getByLabelText("Your name"), "F");
    await userEvent.type(screen.getByLabelText("Email"), "f@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("at least 12 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the platform's refusal of a spent code, and switches back to sign-in", async () => {
    stubPlatform({
      "/api/register": { status: 403, body: { detail: "that invitation is not valid" } },
    });
    render(<SignIn onSignedIn={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Have an invitation/ }));
    await userEvent.type(screen.getByLabelText("Invitation code"), "used");
    await userEvent.type(screen.getByLabelText("Your name"), "F");
    await userEvent.type(screen.getByLabelText("Email"), "f@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "a long enough passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("that invitation is not valid");
    await userEvent.click(screen.getByRole("button", { name: /Already have an account/ }));
    expect(screen.queryByLabelText("Invitation code")).not.toBeInTheDocument();
  });
});
