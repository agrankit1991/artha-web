/**
 * A scrollbar always in view beside a box holding more than it shows (the
 * owner, 2026-11-08: "add scroll bar to companies list if it gets bigger").
 *
 * Drawn here rather than left to the browser: with overlay scrollbars --
 * Firefox on Linux by default, and macOS -- the browser's own shows only
 * while scrolling, so a list of four hundred companies looked as if it
 * ended at its box's foot. The thumb is as long as the share in view and
 * sits where the box is scrolled to; dragging it scrolls, and a press on
 * the rail beside it moves a box's height. The box itself still scrolls by
 * wheel, keys and touch, which is why the rail is hidden from assistive
 * technology: the box is the scrollbar there.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface ScrollRailProps {
  /** The box that scrolls, once it is drawn. */
  target: HTMLElement | null;
  /** How many things it holds: a change measures it again. */
  items: number;
}

/** The shortest a thumb is drawn, as a share of the rail, so a long list keeps one to take hold of. */
const LEAST_THUMB = 0.08;

/**
 * Render the rail, or nothing while the box holds no more than it shows.
 *
 * @param props - The box and how much it holds.
 * @returns The rail.
 */
export function ScrollRail({ target, items }: ScrollRailProps): React.JSX.Element | null {
  const rail = useRef<HTMLDivElement>(null);
  // The share of the box's content in view, and how far it is scrolled, from nought to one.
  const [view, setView] = useState({ shown: 1, at: 0 });
  const [from, setFrom] = useState<{ y: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (target === null) {
      return undefined;
    }
    const measure = (): void => {
      const { scrollHeight, clientHeight, scrollTop } = target;
      const room = scrollHeight - clientHeight;
      setView({
        shown: scrollHeight === 0 ? 1 : Math.min(1, clientHeight / scrollHeight),
        at: room <= 0 ? 0 : scrollTop / room,
      });
    };
    measure();
    target.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => {
      target.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [target, items]);

  // A drag followed on the window, so it keeps up with a pointer leaving a thin rail.
  useEffect(() => {
    const height = rail.current?.clientHeight ?? 0;
    if (from === null || target === null || height === 0) {
      return undefined;
    }
    const move = (event: MouseEvent): void => {
      target.scrollTop = from.top + ((event.clientY - from.y) / height) * target.scrollHeight;
    };
    const release = (): void => {
      setFrom(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
    };
  }, [from, target]);

  if (target === null || view.shown >= 1) {
    return null;
  }
  const length = Math.max(view.shown, LEAST_THUMB);
  const top = view.at * (1 - length);
  return (
    <div
      ref={rail}
      aria-hidden="true"
      data-testid="scroll-rail"
      className="absolute top-1 right-0.5 bottom-1 w-1.5 cursor-pointer rounded-full bg-border/50"
      onPointerDown={(event) => {
        // A press on the rail beside the thumb moves the box a height towards it.
        const box = event.currentTarget.getBoundingClientRect();
        const pressed = (event.clientY - box.top) / Math.max(box.height, 1);
        target.scrollBy({ top: pressed < top ? -target.clientHeight : target.clientHeight });
      }}
    >
      <div
        data-testid="scroll-thumb"
        className="absolute left-0 w-full rounded-full bg-muted-foreground/60 hover:bg-muted-foreground"
        style={{ top: `${String(top * 100)}%`, height: `${String(length * 100)}%` }}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
          setFrom({ y: event.clientY, top: target.scrollTop });
        }}
      />
    </div>
  );
}
