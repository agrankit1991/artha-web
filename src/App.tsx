/**
 * The application shell.
 *
 * Decides between the sign-in page and the application by asking the
 * platform who is signed in, rather than by trusting anything the browser
 * holds: the session cookie is HttpOnly, so this side cannot read it and
 * should not try to infer it.
 *
 * Once signed in, the screens are routed. A route rather than a piece of
 * component state because these are places -- a reader bookmarks the
 * breadth page, opens it in a second tab, and presses Back expecting to
 * arrive where they were.
 */

import { Activity, LayoutDashboard, Newspaper, PiggyBank, Rocket, User } from "lucide-react";
import { useCallback, useState } from "react";
import { BrowserRouter, Route, Routes, useNavigate, useParams } from "react-router-dom";

import type { Account } from "@/api/client";
import { fetchAccount, fetchHello, signOut } from "@/api/client";
import { AppShell, type Screen } from "@/components/AppShell";
import { useResource } from "@/hooks/useResource";
import { PATHS, populationPath } from "@/lib/paths";
import { ThemeProvider } from "@/lib/theme";
import { Breadth } from "@/routes/Breadth";
import { Company } from "@/routes/Company";
import { Fund } from "@/routes/Fund";
import { Funds } from "@/routes/Funds";
import { Ipos } from "@/routes/Ipos";
import { News } from "@/routes/News";
import { Overview } from "@/routes/Overview";
import { Population } from "@/routes/Population";
import { Profile } from "@/routes/Profile";
import { SignIn } from "@/routes/SignIn";

/** The navigation, in the order the screens are meant to be read. */
const SCREENS: Screen[] = [
  { path: PATHS.overview, label: "Overview", icon: LayoutDashboard, exact: true },
  { path: PATHS.breadth, label: "Breadth", icon: Activity },
  { path: PATHS.news, label: "News", icon: Newspaper },
  { path: PATHS.ipos, label: "IPOs", icon: Rocket },
  { path: PATHS.funds, label: "Funds", icon: PiggyBank },
  { path: PATHS.profile, label: "Profile", icon: User },
];

/**
 * Render the application.
 *
 * @returns The shell, and whichever of the two states it is in.
 */
export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ThemeProvider>
  );
}

/** The part that knows whether anybody is signed in. */
function Shell(): React.JSX.Element {
  const [account, setAccount] = useState<Account | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const whoami = useCallback(() => fetchAccount(), []);
  const session = useResource(whoami);
  const navigate = useNavigate();

  // Signing out takes effect here rather than waiting for the platform to
  // confirm it. The request is still made and still ends the session; what
  // would be wrong is leaving the application on screen while it travels.
  const current = signedOut ? null : (account ?? session.data);

  const leave = useCallback(() => {
    setSignedOut(true);
    setAccount(null);
    void signOut();
  }, []);

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
    <SignedIn
      account={current}
      onSignOut={leave}
      onNavigate={(path) => {
        void navigate(path);
      }}
    />
  );
}

/** The application proper, once there is somebody to show it to. */
function SignedIn({
  account,
  onSignOut,
  onNavigate,
}: {
  account: Account;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}): React.JSX.Element {
  // Asked once, for the footer: which build is running is the first thing
  // worth knowing when a screen disagrees with what the code says it does.
  const greeting = useCallback(() => fetchHello(), []);
  const hello = useResource(greeting);

  return (
    <AppShell
      account={account}
      screens={SCREENS}
      build={hello.data}
      onOpenProfile={() => {
        onNavigate(PATHS.profile);
      }}
      onSignOut={onSignOut}
    >
      <Routes>
        <Route
          path={PATHS.overview}
          element={
            <Overview
              onOpenIndex={(key) => {
                onNavigate(populationPath("index", key));
              }}
              onOpenPopulation={(kind, key) => {
                onNavigate(populationPath(kind, key));
              }}
              onOpenBreadth={() => {
                onNavigate(PATHS.breadth);
              }}
              onOpenNews={() => {
                onNavigate(PATHS.news);
              }}
            />
          }
        />
        <Route path={PATHS.breadth} element={<Breadth />} />
        <Route path={PATHS.news} element={<News />} />
        <Route path={PATHS.ipos} element={<Ipos />} />
        <Route path={PATHS.funds} element={<Funds />} />
        <Route path="/fund/:code" element={<FundRoute />} />
        <Route path="/company/:key" element={<CompanyRoute />} />
        <Route path="/index/:key" element={<PopulationRoute kind="index" />} />
        <Route path="/sector/:key" element={<PopulationRoute kind="sector" />} />
        <Route path={PATHS.profile} element={<Profile account={account} onSignOut={onSignOut} />} />
      </Routes>
    </AppShell>
  );
}

/**
 * Read the population key out of the path and show its page.
 *
 * @param props - Which kind of population the route is for.
 * @returns The page.
 */
function PopulationRoute({ kind }: { kind: "index" | "sector" }): React.JSX.Element {
  const { key } = useParams();
  return <Population kind={kind} scopeKey={key ?? ""} />;
}

/**
 * Read the scheme code out of the path and show its page.
 *
 * @returns The page.
 */
function FundRoute(): React.JSX.Element {
  const { code } = useParams();
  return <Fund schemeCode={code ?? ""} />;
}

/**
 * Read the company's listing out of the path and show its page.
 *
 * @returns The page.
 */
function CompanyRoute(): React.JSX.Element {
  const { key } = useParams();
  return <Company instrumentKey={key ?? ""} />;
}

/** What shows while the platform is being asked who is signed in. */
function Waiting(): React.JSX.Element {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
