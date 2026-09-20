/**
 * A button that opens a panel of choices.
 *
 * Written here rather than taken from Radix, and the reason is recorded in
 * this repository's notes: Radix's dropdown opens on pointer events that
 * jsdom does not implement, so a menu built on it cannot be driven by any
 * test short of a real browser. A menu carries sign-out and theme choices,
 * which are exactly the things worth having tests for.
 *
 * What it does implement is what a menu owes its reader: it closes on
 * Escape and on a click outside, it says it is a menu and whether it is
 * open, and every choice is a real button.
 */

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface MenuProps {
  /** What the trigger shows. */
  trigger: React.ReactNode;
  /** What to call the menu, for a reader who cannot see the trigger. */
  label: string;
  /** The choices. `close` shuts the panel once one has been acted on. */
  children: (close: () => void) => React.ReactNode;
  /** Which edge of the trigger the panel lines up with. */
  align?: "start" | "end";
  className?: string;
  triggerClassName?: string;
}

/**
 * Render the trigger and, while it is open, the panel.
 *
 * @param props - The trigger, the choices, and how to place them.
 * @returns The menu.
 */
export function Menu({
  trigger,
  label,
  children,
  align = "end",
  className,
  triggerClassName,
}: MenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const dismiss = (event: MouseEvent): void => {
      if (holder.current !== null && !holder.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={holder} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        className={cn(
          "inline-flex items-center gap-2 rounded-md text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName,
        )}
        onClick={() => {
          setOpen((showing) => !showing);
        }}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute z-50 mt-2 min-w-56 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children(() => {
            setOpen(false);
          })}
        </div>
      )}
    </div>
  );
}

/** A heading inside a menu, naming the group of choices under it. */
export function MenuLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

/** A rule between groups of choices. */
export function MenuSeparator(): React.JSX.Element {
  return <div className="-mx-1 my-1 h-px bg-border" role="separator" />;
}

interface MenuItemProps {
  children: React.ReactNode;
  onSelect: () => void;
  /** Whether this is the choice currently in force. */
  selected?: boolean;
  className?: string;
}

/**
 * One choice in a menu.
 *
 * @param props - What it says, what it does, and whether it is in force.
 * @returns The choice.
 */
export function MenuItem({
  children,
  onSelect,
  selected = false,
  className,
}: MenuItemProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      // Announced as well as marked: the tick beside the chosen item is
      // invisible to a screen reader, and a menu that cannot say which
      // choice is in force is a menu that has to be guessed at.
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none",
        selected && "bg-accent/60 font-medium",
        className,
      )}
    >
      {children}
    </button>
  );
}
