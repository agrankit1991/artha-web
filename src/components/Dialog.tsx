/**
 * A panel that takes the page over until it is answered.
 *
 * Written here rather than taken from Radix, for the reason the menu was:
 * a dialog that opens on pointer events jsdom does not implement cannot
 * be driven by any test short of a real browser, and a dialog carries the
 * things worth testing -- creating a list, editing a note, confirming a
 * deletion.
 *
 * What it does implement is what a dialog owes its reader: it says it is
 * a dialog and what it is called, it closes on Escape and on a click on
 * the backdrop, it takes focus when it opens and gives it back when it
 * closes, and the page behind it is marked inert to a screen reader.
 */

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  /** Asked to close: Escape, the backdrop, the cross, or a Cancel inside. */
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Buttons along the bottom, usually Cancel and the action. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Render the dialog while it is open.
 *
 * @param props - What it is called, what it holds, and how it closes.
 * @returns The dialog, or nothing while closed.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  className,
}: DialogProps): React.JSX.Element | null {
  const titleId = useId();
  const descriptionId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  // Focus goes in when it opens and back to what had it when it closes,
  // so a keyboard reader is neither stranded behind it nor dropped at the
  // top of the page after it.
  useEffect(() => {
    if (!open) {
      return;
    }
    opener.current = document.activeElement;
    const first = panel.current?.querySelector<HTMLElement>(
      "input, textarea, select, button:not([data-dialog-close])",
    );
    (first ?? panel.current)?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener.current instanceof HTMLElement) {
        opener.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        // The backdrop, not a click inside the panel that bubbled up.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      data-testid="dialog-backdrop"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
        className={cn(
          "w-full max-w-lg rounded-lg border bg-card p-5 text-card-foreground shadow-xl focus:outline-none",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold leading-tight">
              {title}
            </h2>
            {description !== undefined && (
              <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close"
            data-dialog-close
            onClick={onClose}
            className="-mr-2 -mt-1 shrink-0"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 space-y-4">{children}</div>
        {actions !== undefined && (
          <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
