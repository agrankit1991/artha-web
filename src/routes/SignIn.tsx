/**
 * The sign-in page, and sign-up for someone holding an invitation.
 *
 * There is no open sign-up: an account is made only with a single-use code
 * the owner minted. An invitation link (`/?invite=<code>`) opens the
 * sign-up form with the code filled in; anyone else can switch to it and
 * paste a code they were sent.
 */

import "@fontsource/tiro-devanagari-sanskrit/devanagari-400.css";
import { type SyntheticEvent, useState } from "react";

import type { Account } from "@/api/client";
import { register, signIn } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeMenu } from "@/components/ThemeMenu";
import { sentence } from "@/lib/format";

/** Shortest password the platform accepts; said here so the form can say it first. */
const MINIMUM_PASSWORD = 12;

/**
 * Ask for an address and a password -- and, with an invitation, a name.
 *
 * @param props - What to do once someone is signed in.
 * @returns The page.
 */
export function SignIn({
  onSignedIn,
}: {
  onSignedIn: (account: Account) => void;
}): React.JSX.Element {
  const invited = new URLSearchParams(window.location.search).get("invite") ?? "";
  const [joining, setJoining] = useState(invited !== "");
  const [code, setCode] = useState(invited);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signedIn = (account: Account): void => {
    // The code is spent; it should not linger in the address bar or history.
    if (invited !== "") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    onSignedIn(account);
  };

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    if (joining && password.length < MINIMUM_PASSWORD) {
      setFailure(`The password needs at least ${String(MINIMUM_PASSWORD)} characters.`);
      return;
    }
    setBusy(true);
    setFailure(null);
    const attempt = joining
      ? register({ invitation: code.trim(), email, display_name: name.trim(), password })
      : signIn(email, password);
    attempt
      .then(signedIn)
      .catch((error: unknown) => {
        setFailure(error instanceof Error ? sentence(error.message) : "Could not sign in.");
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const field = (
    id: string,
    label: string,
    value: string,
    set: (next: string) => void,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ): React.JSX.Element => (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        required
        value={value}
        onChange={(event) => {
          set(event.target.value);
        }}
        {...props}
      />
    </div>
  );

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      {/* A soft wash of the logo's two colours behind the page: the one
          place the brand is the whole of what a visitor sees. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,var(--brand)_12%,transparent),transparent_55%)]"
      />
      <div className="relative flex justify-end p-4">
        <ThemeMenu />
      </div>
      <div className="relative flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Decorative: the name below says whose it is. */}
            <img
              src="/brand/logo.svg"
              alt=""
              className="h-20 w-20 motion-safe:animate-surface-in"
            />
            <div>
              <h1 className="text-page font-bold tracking-tight">
                <span className="text-wordmark-artha">Artha</span>{" "}
                <span className="text-wordmark-science">Science</span>
              </h1>
              <p lang="hi" className="font-devanagari text-2xl leading-snug">
                <span className="text-wordmark-artha">अर्थ</span>{" "}
                <span className="text-wordmark-science">विज्ञान</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">End-of-day research for Indian markets.</p>
          </div>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle as="h2">{joining ? "Create your account" : "Sign in"}</CardTitle>
              <CardDescription>
                {joining
                  ? "With the invitation you were sent."
                  : "Welcome back. Sign in to continue."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="grid gap-4">
                {joining &&
                  field("invitation", "Invitation code", code, setCode, { autoComplete: "off" })}
                {joining && field("name", "Your name", name, setName, { autoComplete: "name" })}
                {field("email", "Email", email, setEmail, {
                  type: "email",
                  autoComplete: "username",
                })}
                {field("password", "Password", password, setPassword, {
                  type: "password",
                  autoComplete: joining ? "new-password" : "current-password",
                  ...(joining ? { minLength: MINIMUM_PASSWORD } : {}),
                })}
                {joining && (
                  <p className="-mt-2 text-xs text-muted-foreground">
                    At least {MINIMUM_PASSWORD} characters. A few words together is easier to
                    remember and harder to guess.
                  </p>
                )}
                {failure !== null && (
                  <p role="alert" className="text-sm text-destructive">
                    {failure}
                  </p>
                )}
                <Button type="submit" disabled={busy}>
                  {joining
                    ? busy
                      ? "Creating account…"
                      : "Create account"
                    : busy
                      ? "Signing in…"
                      : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setJoining(!joining);
                    setFailure(null);
                  }}
                >
                  {joining
                    ? "Already have an account? Sign in"
                    : "Have an invitation? Create an account"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
