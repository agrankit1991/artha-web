/**
 * The frame every screen sits in: navigation down the side, the account and
 * the theme across the top, and what the build is at the bottom.
 *
 * The sidebar is the navigation because this application is a set of places
 * rather than a flow, and a list down the side shows all of them at once
 * and says which one is showing. It collapses to icons on a narrow desktop
 * and out of the way entirely on a phone, where the header carries the
 * button that brings it back.
 */

import { Menu as MenuIcon, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import type { Account } from "@/api/client";
import { ThemeMenu } from "@/components/ThemeMenu";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

/** The parts of the application, in the order they are read. */
export type ScreenGroup = "Markets" | "Research" | "Mine";

/** One place the application can be. */
export interface Screen {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Which part of the application it belongs to. Twelve destinations in
   * one flat list is a list nobody scans; three short ones under headings
   * are read at a glance.
   */
  group: ScreenGroup;
  /** Whether the path must match exactly, for the one that is a prefix of all. */
  exact?: boolean;
}

const GROUPS: ScreenGroup[] = ["Markets", "Research", "Mine"];

interface AppShellProps {
  account: Account;
  screens: Screen[];
  /** What the platform calls itself and which build is running. */
  build?: { service: string; version: string } | null;
  onOpenProfile: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
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
  onOpenProfile,
  onSignOut,
  children,
}: AppShellProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

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
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={() => {
            setOpen(false);
          }}
        />
      )}

      <div className="flex min-h-svh flex-col lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-layout-border bg-layout/95 text-layout-foreground backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              type="button"
              className="rounded-md p-2 hover:bg-layout-accent lg:hidden"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => {
                setOpen((showing) => !showing);
              }}
            >
              {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <ThemeMenu />
              <UserMenu account={account} onOpenProfile={onOpenProfile} onSignOut={onSignOut} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4">{children}</main>

        <footer className="border-t border-layout-border bg-layout text-layout-foreground">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs opacity-70">
            <span>Artha Science · end-of-day data for Indian markets</span>
            <span className="tabular">
              {build === null || build === undefined
                ? "Connecting…"
                : `${build.service} ${build.version}`}
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
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 border-r border-layout-border bg-layout text-layout-foreground transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-layout-border px-4">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
        >
          A
        </span>
        <span className="font-semibold">Artha Science</span>
      </div>
      <nav className="space-y-4 p-3" aria-label="Screens">
        {GROUPS.filter((group) => screens.some((screen) => screen.group === group)).map((group) => {
          const members = screens.filter((screen) => screen.group === group);
          return (
            <div key={group} className="space-y-1">
              <div className="px-3 text-[0.65rem] font-semibold uppercase tracking-wider opacity-50">
                {group}
              </div>
              {members.map((screen) => (
                <NavLink
                  key={screen.path}
                  to={screen.path}
                  end={screen.exact ?? false}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "opacity-70 hover:bg-layout-accent hover:opacity-100",
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
