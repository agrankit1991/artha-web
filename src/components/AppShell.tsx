/**
 * The frame every screen sits in: navigation down the side, search, the
 * theme and the account across the top, and what the data reaches and which
 * build is running at the bottom.
 *
 * The sidebar is the navigation because this application is a set of places
 * rather than a flow, and a list down the side shows all of them at once
 * and says which one is showing. On a phone it slides away entirely, and
 * the header carries the button that brings it back and the logo that
 * leads home.
 */

import { Menu as MenuIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import type { Account } from "@/api/client";
import { SearchBox } from "@/components/SearchBox";
import { ThemeMenu } from "@/components/ThemeMenu";
import { UserMenu } from "@/components/UserMenu";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The parts of the application, in the order they are read. */
export type ScreenGroup = "Markets" | "Research" | "Mine";

/** One place the application can be. */
export interface Screen {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Which part of the application it belongs to. Twenty destinations in one
   * flat list is a list nobody scans; three short ones under headings are
   * read at a glance.
   */
  group: ScreenGroup;
  /** Whether the path must match exactly, for the one that is a prefix of all. */
  exact?: boolean;
  /**
   * Addresses that are this place too, though they do not start with its
   * path: a strategy's own page belongs under Strategies, one mover list
   * under Movers. Without them no item is lit on a detail page, and a reader
   * loses where they are.
   */
  matches?: readonly string[];
}

const GROUPS: ScreenGroup[] = ["Markets", "Research", "Mine"];

interface AppShellProps {
  account: Account;
  screens: Screen[];
  /** What the platform calls itself and which build is running. */
  build?: { service: string; version: string } | null;
  /** The latest session the platform holds figures for, so staleness shows. */
  latestSession?: string | null;
  onOpenProfile: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

/**
 * The logo and the name in the logo's two colours, leading home.
 *
 * Named by a label rather than by its text, because on a phone the text is
 * hidden and a link without a name is announced as nothing.
 */
function Brand({ className }: { className?: string }): React.JSX.Element {
  return (
    <Link
      to="/"
      viewTransition
      aria-label="Artha Science"
      className={cn("flex items-center gap-2", className)}
    >
      <img src="/brand/logo.svg" alt="" className="h-9 w-9" />
      <span className="font-semibold tracking-tight">
        <span className="text-wordmark-artha">Artha</span>{" "}
        <span className="text-wordmark-science">Science</span>
      </span>
    </Link>
  );
}

/**
 * Render the frame.
 *
 * @param props - Who is signed in, where they can go, and what to show.
 * @returns The shell, with the current screen inside it.
 */
export function AppShell({
  account,
  screens,
  build,
  latestSession,
  onOpenProfile,
  onSignOut,
  children,
}: AppShellProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    // Escape closes the phone's navigation, and the focus goes back to the
    // button that opened it rather than into the page behind.
    const close = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
        opener.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="min-h-svh bg-background">
      <Sidebar
        screens={screens}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />

      {/* The overlay exists only on a phone, where the sidebar covers the
          page rather than sitting beside it. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-overlay motion-safe:animate-fade-in lg:hidden"
          aria-hidden="true"
          onClick={() => {
            setOpen(false);
          }}
        />
      )}

      <div className="flex min-h-svh flex-col lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-chrome-border bg-chrome/95 text-chrome-foreground backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
            <button
              ref={opener}
              type="button"
              className="rounded-md p-2 hover:bg-chrome-accent lg:hidden"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => {
                setOpen((showing) => !showing);
              }}
            >
              {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
            {/* On a phone the sidebar is away, so the header says whose
                site this is and leads home; the name only where it fits. */}
            <Brand className="shrink-0 lg:hidden [&>span]:hidden sm:[&>span]:inline" />
            <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-2">
              <SearchBox />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeMenu />
              <UserMenu account={account} onOpenProfile={onOpenProfile} onSignOut={onSignOut} />
            </div>
          </div>
        </header>

        {/* Named for the page transition: only this moves between pages, so
            the frame around it reads as fixed. */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 [view-transition-name:page]">
          {children}
        </main>

        <footer className="border-t border-chrome-border bg-chrome text-chrome-foreground">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <img src="/brand/logo.svg" alt="" className="h-5 w-5" />
              Artha Science · end-of-day research for Indian markets
            </span>
            <span className="tabular flex flex-wrap items-center gap-x-4 gap-y-1">
              {latestSession !== undefined && latestSession !== null && (
                <span>Data to {formatDay(latestSession)}</span>
              )}
              <span>
                {build === null || build === undefined
                  ? "Connecting…"
                  : `${build.service} ${build.version}`}
              </span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** The navigation, down the side. */
function Sidebar({
  screens,
  open,
  onClose,
}: {
  screens: Screen[];
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const { pathname } = useLocation();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-chrome-border bg-chrome text-chrome-foreground transition-[transform,visibility] duration-200 ease-brand lg:visible lg:translate-x-0",
        // Hidden, not only moved, while it is shut on a phone: its links
        // leave the tab order and the reading order until it is opened.
        open ? "visible translate-x-0" : "invisible -translate-x-full",
      )}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-chrome-border px-4">
        <Brand />
      </div>
      {/* The list scrolls on its own when the window is shorter than it, the
          name above it staying put; and a scroll that reaches its end does
          not carry on into the page behind. */}
      <nav
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3"
        aria-label="Screens"
      >
        {GROUPS.filter((group) => screens.some((screen) => screen.group === group)).map((group) => {
          const members = screens.filter((screen) => screen.group === group);
          return (
            <div key={group} className="space-y-1">
              <div className="px-3 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
              {members.map((screen) => (
                <NavLink
                  key={screen.path}
                  to={screen.path}
                  end={screen.exact ?? false}
                  viewTransition
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive ||
                        (screen.matches ?? []).some((prefix) => pathname.startsWith(prefix))
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "text-chrome-foreground/75 hover:bg-chrome-accent hover:text-chrome-foreground",
                    )
                  }
                >
                  <screen.icon className="h-4 w-4 shrink-0" />
                  {screen.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
