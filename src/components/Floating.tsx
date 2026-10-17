/**
 * A bubble floating over the page beside an anchor, outside every box that would clip it.
 *
 * A bubble placed inside its anchor's parent is cut off by any scrolling
 * box around it: the owner found a column's hint, in a table's last
 * column, opening inside the table and truncated by its border
 * (2026-10-17). So the bubble is drawn in a layer above the page (a portal
 * into the document's body) and placed from the anchor's position on the
 * screen: below it, or above when there is no room below; lined up with
 * the anchor's left or right edge; and kept a margin inside the screen
 * either way.
 *
 * It is drawn once unseen to measure its own size, then placed. A fixed
 * bubble does not follow its anchor, so it closes when the page or any box
 * in it scrolls, or the window resizes.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** The space between the anchor and the bubble, in pixels. */
const GAP = 4;

/** The least space kept between the bubble and the screen's edge, in pixels. */
const MARGIN = 8;

/** Where the bubble sits on the screen. */
interface Place {
  top: number;
  left: number;
}

/**
 * Where a bubble goes beside its anchor, inside the screen.
 *
 * @param anchor - The anchor's box on the screen.
 * @param size - The bubble's own width and height.
 * @param screen - The screen's width and height.
 * @param side - Line the bubble's left edge up with the anchor's (`end`,
 *   opening towards the line's end) or its right edge (`start`).
 * @returns The bubble's top and left, in pixels from the screen's corner.
 */
export function placeBeside(
  anchor: { top: number; bottom: number; left: number; right: number },
  size: { width: number; height: number },
  screen: { width: number; height: number },
  side: "start" | "end",
): Place {
  const wanted = side === "end" ? anchor.left : anchor.right - size.width;
  const left = Math.max(MARGIN, Math.min(wanted, screen.width - size.width - MARGIN));
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - size.height;
  const roomBelow = below + size.height <= screen.height - MARGIN;
  return { top: roomBelow || above < MARGIN ? below : above, left };
}

interface FloatingProps {
  /** What the bubble is beside. */
  anchor: React.RefObject<HTMLElement | null>;
  /** Which way it opens from the anchor (`placeBeside`). */
  side: "start" | "end";
  /** Told when the bubble should close: the page scrolled or the window resized. */
  onDismiss: () => void;
  /** The bubble's id, for the anchor's `aria-describedby`. */
  id: string;
  /** Its look; its position is this component's. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Draw the bubble above the page, beside its anchor.
 *
 * @param props - The anchor, the side, what to call on dismissal, the id and the content.
 * @returns The bubble, in a portal.
 */
export function Floating({
  anchor,
  side,
  onDismiss,
  id,
  className,
  children,
}: FloatingProps): React.JSX.Element {
  const bubble = useRef<HTMLSpanElement>(null);
  const [place, setPlace] = useState<Place | null>(null);

  useLayoutEffect(() => {
    const mark = anchor.current;
    const own = bubble.current;
    if (mark === null || own === null) {
      return;
    }
    setPlace(
      placeBeside(
        mark.getBoundingClientRect(),
        { width: own.offsetWidth, height: own.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        side,
      ),
    );
  }, [anchor, side]);

  useEffect(() => {
    // Capture, so a scroll inside a table's own box closes it as well as the page's.
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [onDismiss]);

  return createPortal(
    <span
      ref={bubble}
      id={id}
      role="tooltip"
      className={className}
      style={
        place === null
          ? { position: "fixed", top: 0, left: 0, visibility: "hidden" }
          : { position: "fixed", top: place.top, left: place.left }
      }
    >
      {children}
    </span>,
    document.body,
  );
}
