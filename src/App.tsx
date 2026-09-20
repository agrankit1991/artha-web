/**
 * The application shell.
 *
 * Decides between the sign-in page and the application by asking the
 * platform who is signed in, rather than by trusting anything the browser
 * holds: the session cookie is HttpOnly, so this side cannot read it and
 * should not try to infer it.
 */

import { useCallback, useState } from "react";

import type { Account } from "@/api/client";
import { fetchAccount, signOut } from "@/api/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { ThemeProvider } from "@/lib/theme";
import { Overview } from "@/routes/Overview";
import { SignIn } from "@/routes/SignIn";

/**
 * Render the application.
 *
 * @returns The shell, and whichever of the two states it is in.
 */
export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}

/** The part that knows whether anybody is signed in. */
function Shell(): React.JSX.Element {
  const [account, setAccount] = useState<Account | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const whoami = useCallback(() => fetchAccount(), []);
  const session = useResource(whoami);

  // Signing out takes effect here rather than waiting for the platform to
  // confirm it. The request is still made and still ends the session; what
  // would be wrong is leaving the application on screen while it travels.
  const current = signedOut ? null : (account ?? session.data);

  if (session.loading && account === null && !signedOut) {
    return <Waiting />;
  }

  if (current === null) {
    return (
      <SignIn
        onSignedIn={(signedIn) => {
          setSignedOut(false);
          setAccount(signedIn);
        }}
      />
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
          <span className="font-semibold">Artha Science</span>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {current.display_name}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSignedOut(true);
                setAccount(null);
                void signOut();
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] p-4">
        <Overview />
      </main>
    </div>
  );
}

/** What shows while the platform is being asked who is signed in. */
function Waiting(): React.JSX.Element {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
