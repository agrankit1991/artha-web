/**
 * Switching between light, dark and following the system.
 *
 * A visible group of three rather than a menu. There are only three states
 * and they fit in the space a menu's trigger would take, so hiding them
 * behind a click buys nothing -- and a control whose current state is
 * visible without opening it is the better one at the top of a page.
 */

import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type ThemeChoice, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const CHOICES: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/**
 * Offer the three theme choices, showing which is in force.
 *
 * @returns The control.
 */
export function ThemeToggle(): React.JSX.Element {
  const { choice, setChoice } = useTheme();

  return (
    <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Theme">
      {CHOICES.map(({ value, label, Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="icon"
          // Pressed rather than a colour alone: it is how the current
          // choice reaches a screen reader, and how it survives a theme
          // where the two backgrounds are close together.
          aria-pressed={value === choice}
          aria-label={label}
          className={cn("size-7", value === choice && "bg-accent text-accent-foreground")}
          onClick={() => {
            setChoice(value);
          }}
        >
          <Icon className="size-4" />
        </Button>
      ))}
    </div>
  );
}
