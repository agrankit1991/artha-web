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

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/** A menu's panel, under its button or at the pointer. */
const PANEL =
  "z-50 max-h-[60vh] min-w-56 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg motion-safe:animate-surface-in";

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
          // Scrolls within the screen: a company's indices or the strategies
          // picking it can run to fifty or a hundred and more.
          className={cn(
            "absolute mt-2",
            PANEL,
            align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left",
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

/** Room kept between a menu at the pointer and the window's edge, in pixels. */
const EDGE = 8;

interface ContextMenuProps {
  /** Where it opens: the pointer's place on the screen, or null while shut. */
  at: { x: number; y: number } | null;
  /** What to call the menu, for a reader who cannot see it. */
  label: string;
  /** Asked to shut: Escape, a click or a scroll elsewhere, the window resized. */
  onClose: () => void;
  /** The choices. `close` shuts it once one has been acted on. */
  children: (close: () => void) => React.ReactNode;
}

/**
 * A menu opened where the reader right-clicked, rather than under a button.
 *
 * Over everything (a portal into the body, so no chart or scrolling box
 * clips it), held inside the window and turned above the pointer near its
 * foot. It shuts as a menu does, on Escape or a click elsewhere, and on a
 * scroll elsewhere, which would leave it beside nothing; scrolling its own
 * choices keeps it. Its first choice takes the keyboard.
 *
 * @param props - Where it opens, what it is called, and the choices.
 * @returns The menu, or nothing while shut.
 */
export function ContextMenu({
  at,
  label,
  onClose,
  children,
}: ContextMenuProps): React.JSX.Element | null {
  const panel = useRef<HTMLDivElement>(null);

  // Held inside the window, measured before it is painted.
  useLayoutEffect(() => {
    const element = panel.current;
    if (at === null || element === null) {
      return;
    }
    const { width, height } = element.getBoundingClientRect();
    element.style.left = `${String(Math.max(EDGE, Math.min(at.x, window.innerWidth - width - EDGE)))}px`;
    element.style.top = `${String(at.y + height + EDGE > window.innerHeight ? Math.max(EDGE, at.y - height) : at.y)}px`;
  }, [at]);

  useEffect(() => {
    if (at !== null) {
      panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [at]);

  useEffect(() => {
    if (at === null) {
      return undefined;
    }
    const elsewhere = (event: Event): void => {
      // A page's scroll is the window's or the document's, never inside it.
      const target = event.target;
      if (!(target instanceof Node && panel.current?.contains(target) === true)) {
        onClose();
      }
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", elsewhere);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", elsewhere, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", elsewhere);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", elsewhere, true);
      window.removeEventListener("resize", onClose);
    };
  }, [at, onClose]);

  if (at === null) {
    return null;
  }
  return createPortal(
    <div
      ref={panel}
      role="menu"
      aria-label={label}
      style={{ position: "fixed", left: at.x, top: at.y }}
      className={PANEL}
    >
      {children(onClose)}
    </div>,
    document.body,
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
  /** Shown but not chosen: a list kept updated, whose source decides what it holds. */
  disabled?: boolean;
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
  disabled = false,
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
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none",
        "disabled:cursor-default disabled:opacity-70 disabled:hover:bg-transparent disabled:hover:text-inherit",
        selected && "bg-accent/60 font-medium",
        className,
      )}
    >
      {children}
    </button>
  );
}
