/**
 * Choosing whether the application is drawn light or dark.
 *
 * The colours are the brand's and not a choice; what a reader chooses is
 * light, dark or whatever the machine is set to. The trigger shows the icon
 * of the choice in force, so the header says what is set without opening it.
 */

import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Menu, MenuItem, MenuLabel } from "@/components/Menu";
import { type ThemeChoice, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** One light-and-dark choice, with the icon it is recognised by. */
export interface ThemeOption {
  choice: ThemeChoice;
  label: string;
  icon: typeof Sun;
}

/** Each choice's name and icon, looked up by the choice itself. */
const OPTIONS: Record<ThemeChoice, ThemeOption> = {
  light: { choice: "light", label: "Light", icon: Sun },
  dark: { choice: "dark", label: "Dark", icon: Moon },
  system: { choice: "system", label: "System", icon: Monitor },
};

/** The three light-and-dark choices, in the order they are offered. */
export const THEME_CHOICES: readonly ThemeOption[] = [OPTIONS.light, OPTIONS.dark, OPTIONS.system];

/**
 * Render the theme menu.
 *
 * @returns The menu.
 */
export function ThemeMenu(): React.JSX.Element {
  const { choice, setChoice } = useTheme();
  const current = OPTIONS[choice];

  return (
    <Menu
      label="Theme"
      triggerClassName="h-9 gap-2 rounded-md border border-chrome-border px-3 hover:bg-chrome-accent"
      trigger={
        <>
          <current.icon className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
        </>
      }
    >
      {(close) => (
        <>
          <MenuLabel>Appearance</MenuLabel>
          {THEME_CHOICES.map((mode) => (
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
