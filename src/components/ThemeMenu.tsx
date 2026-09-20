/**
 * Choosing how the application looks.
 *
 * Two axes in one menu, because they are one decision in a reader's head:
 * the accent it points at things with, and whether the surfaces are light,
 * dark or whatever the machine is set to.
 *
 * Every swatch carries its name as well as its colour. A row of coloured
 * circles is unusable to anybody who cannot tell them apart, and the tick
 * marking the one in force is announced rather than only drawn.
 */

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";

import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/Menu";
import { type Accent, ACCENTS, type ThemeChoice, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** What each accent is called, and the swatch that stands for it. */
const ACCENT_NAMES: Record<Accent, string> = {
  slate: "Neutral",
  blue: "Blue",
  green: "Green",
  orange: "Orange",
  violet: "Violet",
};

/** The swatch colours, which are the accents themselves at a fixed shade. */
const SWATCHES: Record<Accent, string> = {
  slate: "oklch(0.44 0.017 285.8)",
  blue: "oklch(0.55 0.21 258)",
  green: "oklch(0.55 0.15 155)",
  orange: "oklch(0.63 0.2 42)",
  violet: "oklch(0.55 0.24 295)",
};

/** The three light-and-dark choices, with the icon each is recognised by. */
const MODES: { choice: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { choice: "light", label: "Light", icon: Sun },
  { choice: "dark", label: "Dark", icon: Moon },
  { choice: "system", label: "System", icon: Monitor },
];

/**
 * Render the theme menu.
 *
 * @returns The menu.
 */
export function ThemeMenu(): React.JSX.Element {
  const { choice, accent, setChoice, setAccent } = useTheme();

  return (
    <Menu
      label="Theme"
      triggerClassName="h-9 gap-2 rounded-md border px-3 hover:bg-accent"
      trigger={
        <>
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full border border-border"
            style={{ backgroundColor: SWATCHES[accent] }}
          />
        </>
      }
    >
      {(close) => (
        <>
          <MenuLabel>Accent</MenuLabel>
          {ACCENTS.map((option) => (
            <MenuItem
              key={option}
              selected={option === accent}
              onSelect={() => {
                setAccent(option);
                close();
              }}
            >
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: SWATCHES[option] }}
              />
              <span className="flex-1">{ACCENT_NAMES[option]}</span>
              <Check className={cn("h-4 w-4", option === accent ? "opacity-100" : "opacity-0")} />
            </MenuItem>
          ))}

          <MenuSeparator />
          <MenuLabel>Appearance</MenuLabel>
          {MODES.map((mode) => (
            <MenuItem
              key={mode.choice}
              selected={mode.choice === choice}
              onSelect={() => {
                setChoice(mode.choice);
                close();
              }}
            >
              <mode.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{mode.label}</span>
              <Check
                className={cn("h-4 w-4", mode.choice === choice ? "opacity-100" : "opacity-0")}
              />
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}
