/**
 * Moving around without the mouse.
 *
 * Kite's habit, which a reader who checks the same six pages every evening
 * comes to rely on: `g` then a letter jumps to a page, `?` lists every
 * shortcut, and `/` (handled by the search box) finds anything. None of
 * them fire while the reader is typing into a field, where the same keys
 * are characters.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Dialog } from "@/components/Dialog";
import { PATHS } from "@/lib/paths";

/** The pages `g` then a letter jumps to. */
export const JUMPS: readonly { key: string; path: string; label: string }[] = [
  { key: "o", path: PATHS.overview, label: "Overview" },
  { key: "i", path: PATHS.indices, label: "Indices" },
  { key: "s", path: PATHS.sectors, label: "Sectors" },
  { key: "b", path: PATHS.breadth, label: "Breadth" },
  { key: "f", path: PATHS.flows, label: "FII / DII" },
  { key: "d", path: PATHS.deals, label: "Deals" },
  { key: "m", path: PATHS.movers, label: "Movers" },
  { key: "e", path: PATHS.earnings, label: "Earnings" },
  { key: "n", path: PATHS.news, label: "News" },
  { key: "w", path: PATHS.watchlists, label: "Watchlists" },
];

/** How long after `g` the next letter still counts as a jump. */
const CHORD_MILLISECONDS = 1200;

/**
 * Listen for the shortcuts and show the list when asked.
 *
 * @returns The list, while it is open.
 */
export function KeyboardShortcuts(): React.JSX.Element {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pending = useRef<number | null>(null);

  useEffect(() => {
    const listen = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const typing =
        target !== null &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
      if (typing || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (pending.current !== null && Date.now() - pending.current <= CHORD_MILLISECONDS) {
        pending.current = null;
        const jump = JUMPS.find((one) => one.key === event.key.toLowerCase());
        if (jump !== undefined) {
          event.preventDefault();
          void navigate(jump.path);
        }
        return;
      }
      pending.current = event.key === "g" ? Date.now() : null;
    };
    window.addEventListener("keydown", listen);
    return () => {
      window.removeEventListener("keydown", listen);
    };
  }, [navigate]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpen(false);
      }}
      title="Keyboard shortcuts"
      description="Anywhere except while typing in a field."
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <Keys keys={["/"]} />
        <dd>Search, or Ctrl + K</dd>
        <Keys keys={["?"]} />
        <dd>This list</dd>
        {JUMPS.map((one) => (
          <Jump key={one.key} letter={one.key} label={one.label} />
        ))}
      </dl>
    </Dialog>
  );
}

/** A jump's keys and where it goes. */
function Jump({ letter, label }: { letter: string; label: string }): React.JSX.Element {
  return (
    <>
      <Keys keys={["g", letter]} />
      <dd>{label}</dd>
    </>
  );
}

/** Keys pressed one after another, as key caps. */
function Keys({ keys }: { keys: string[] }): React.JSX.Element {
  return (
    <dt className="flex gap-1">
      {keys.map((key) => (
        <kbd key={key} className="rounded border bg-muted px-1.5 font-mono text-xs">
          {key}
        </kbd>
      ))}
    </dt>
  );
}
