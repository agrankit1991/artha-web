/**
 * The account page: who is signed in, and what they have chosen.
 *
 * Deliberately short. It shows what the platform actually knows about the
 * account and what this side of it remembers, and nothing invented to fill
 * the page -- a profile with an empty "activity" panel on it is worse than
 * one that admits there is nothing to show.
 */

import { Check, LogOut, Monitor, Moon, Palette, SlidersHorizontal, Sun, User } from "lucide-react";
import { useCallback } from "react";

import type { Account } from "@/api/client";
import { fetchScopes } from "@/api/client";
import { OVERLAYS } from "@/components/ChartControls";
import { Chooser } from "@/components/Chooser";
import { PRICE_RANGES } from "@/components/RangeSelector";
import { ScopePicker } from "@/components/ScopePicker";
import { useResource } from "@/hooks/useResource";
import { resetPreferences, usePreferences, writePreferences } from "@/lib/preferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initialsOf } from "@/components/UserMenu";
import { ACCENT_NAMES, ACCENT_SWATCHES, ACCENTS, type ThemeChoice, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ProfileProps {
  account: Account;
  onSignOut: () => void;
}

const MODES: { choice: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { choice: "light", label: "Light", icon: Sun },
  { choice: "dark", label: "Dark", icon: Moon },
  { choice: "system", label: "System", icon: Monitor },
];

/**
 * Render the profile page.
 *
 * @param props - Who is signed in, and how to end the session.
 * @returns The page.
 */
export function Profile({ account, onSignOut }: ProfileProps): React.JSX.Element {
  const { choice, appearance, accent, setChoice, setAccent } = useTheme();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
        >
          {initialsOf(account.display_name)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{account.display_name}</h1>
          <p className="truncate text-sm text-muted-foreground">{account.email}</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Account
          </CardTitle>
          <CardDescription>What the platform holds about this sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Fact label="Name" value={account.display_name} />
            <Fact label="Email" value={account.email} />
            <Fact label="Role" value={account.is_owner ? "Owner" : "Member"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription>
            Remembered in this browser, not on the account — a different machine starts from its own
            setting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Accent</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Accent">
              {ACCENTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === accent}
                  onClick={() => {
                    setAccent(option);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent",
                    option === accent && "border-primary bg-primary/10",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: ACCENT_SWATCHES[option] }}
                  />
                  {ACCENT_NAMES[option]}
                  {option === accent && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Light and dark</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Appearance">
              {MODES.map((mode) => (
                <button
                  key={mode.choice}
                  type="button"
                  aria-pressed={mode.choice === choice}
                  onClick={() => {
                    setChoice(mode.choice);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent",
                    mode.choice === choice && "border-primary bg-primary/10",
                  )}
                >
                  <mode.icon className="h-4 w-4" />
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {choice === "system"
                ? `Following this machine, which is currently ${appearance}.`
                : `Fixed to ${choice}, whatever the machine is set to.`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>
            Signing out ends this session on the platform, not only in this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
      <PreferencesCard />
    </div>
  );
}

/** One thing the platform knows, labelled. */
function Fact({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

/** The choices the reader makes once and should not make again. */
function PreferencesCard(): React.JSX.Element {
  const preferences = usePreferences();
  const loadScopes = useCallback(() => fetchScopes(), []);
  const scopes = useResource(loadScopes);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-primary" />
          Preferences
        </CardTitle>
        <CardDescription>
          The population the overview opens on, how a price chart is drawn, and how far back a chart
          reaches. Remembered by this browser; changing any of them on a page remembers it too.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Default population</h3>
          <ScopePicker
            scope={preferences.scope}
            options={scopes.data}
            onChange={(next) => {
              writePreferences({ scope: next });
            }}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Price chart</h3>
          <Chooser
            options={[
              { key: "line", label: "Line" },
              { key: "candles", label: "Candles" },
              { key: "area", label: "Area" },
            ]}
            chosen={preferences.chartStyle}
            onChange={(next) => {
              writePreferences({ chartStyle: next });
            }}
            label="Chart style"
          />
          <div className="flex flex-wrap gap-3" role="group" aria-label="Overlays">
            {OVERLAYS.map((overlay) => (
              <label key={overlay.key} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.overlays.includes(overlay.key)}
                  onChange={(event) => {
                    writePreferences({
                      overlays: event.target.checked
                        ? [...preferences.overlays, overlay.key]
                        : preferences.overlays.filter((one) => one !== overlay.key),
                    });
                  }}
                />
                {overlay.label}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Default range</h3>
          <Chooser
            options={PRICE_RANGES.map((range) => ({
              key: String(range.sessions),
              label: range.label,
            }))}
            chosen={String(preferences.range)}
            onChange={(next) => {
              writePreferences({ range: Number(next) });
            }}
            label="Default range"
          />
        </div>
        <Button variant="outline" size="sm" onClick={resetPreferences}>
          Forget my preferences
        </Button>
      </CardContent>
    </Card>
  );
}
