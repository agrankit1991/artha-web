/**
 * Choose how one line is drawn: a colour from the swatches or of the
 * reader's own, and a width (the owner's choices, 2026-11-08).
 *
 * One editor for a kind of line in the line styles dialog and for a drawing
 * picked on a chart, so the two choose alike. The first swatch is the
 * default, drawn in the colour it stands for: the chart's own, which follows
 * light and dark, or the colour every drawing is given.
 */

import { Pipette } from "lucide-react";
import { useEffect, useRef } from "react";

import type { LineStyleChange } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { LINE_WIDTHS } from "@/lib/chartLines";
import { SWATCHES } from "@/lib/chartPalette";
import { tokenColour } from "@/lib/tokenColour";
import { cn } from "@/lib/utils";

interface LineStyleEditorProps {
  /** What the line is, naming its controls for a reader who cannot see them. */
  label: string;
  /** What is set, each part null for the default. */
  own: LineStyleChange;
  /** The default colour, drawn on the first swatch: a token or `#rrggbb`. */
  fallbackColour: string;
  /** What the default is called on its swatch. */
  fallbackName?: string;
  onChange: (change: LineStyleChange) => void;
}

/** The width chooser's key for no width of the reader's own. */
const AUTO = "auto";

const WIDTH_OPTIONS = [
  { key: AUTO, label: "Auto" },
  ...LINE_WIDTHS.map((width) => ({ key: String(width), label: `${String(width)}px` })),
];

const SWATCH =
  "h-6 w-6 shrink-0 rounded-full border border-border shadow-sm transition-transform hover:scale-110";

/** How a chosen swatch is marked: a ring a step out from it. */
const PRESSED = "ring-2 ring-primary ring-offset-2 ring-offset-background";

/** A colour as a colour input holds it. */
const HEX = /^#[0-9a-f]{6}$/i;

/** Colours the swatches give, to tell a colour of the reader's own from one of them. */
const OFFERED = new Set<string>(SWATCHES.map((one) => one.colour));

/**
 * Render the swatches, the colour of one's own and the widths.
 *
 * @param props - The line, what is set for it, and what to call on a change.
 * @returns The editor.
 */
export function LineStyleEditor({
  label,
  own,
  fallbackColour,
  fallbackName = "The chart's own",
  onChange,
}: LineStyleEditorProps): React.JSX.Element {
  const custom = useRef<HTMLInputElement>(null);
  const ownColour = own.colour !== null && !OFFERED.has(own.colour);

  // Kept when the picker is closed (the input's `change`), not while it is
  // dragged (its `input`, which React's onChange also hears): each keeping
  // redraws every chart on the page.
  useEffect(() => {
    const input = custom.current;
    if (input === null) {
      return undefined; // Unreachable: the input is always drawn.
    }
    const chosen = (): void => {
      onChange({ ...own, colour: input.value.toLowerCase() });
    };
    input.addEventListener("change", chosen);
    return () => {
      input.removeEventListener("change", chosen);
    };
  }, [own, onChange]);

  // A colour input holds only `#rrggbb`: the default's resolved colour where
  // it is one, else the grey, the last swatch.
  const resolved = tokenColour(fallbackColour);
  const starting = own.colour ?? (HEX.test(resolved) ? resolved : SWATCHES[17].colour);

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label={`${label} colour`}
        className="flex flex-wrap items-center gap-1.5"
      >
        <button
          type="button"
          aria-label={fallbackName}
          title={fallbackName}
          aria-pressed={own.colour === null}
          onClick={() => {
            onChange({ ...own, colour: null });
          }}
          className={cn(SWATCH, own.colour === null && PRESSED)}
          style={{ backgroundColor: fallbackColour }}
        />
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        {SWATCHES.map((one) => (
          <button
            key={one.colour}
            type="button"
            aria-label={one.name}
            title={one.name}
            aria-pressed={own.colour === one.colour}
            onClick={() => {
              onChange({ ...own, colour: one.colour });
            }}
            className={cn(SWATCH, own.colour === one.colour && PRESSED)}
            style={{ backgroundColor: one.colour }}
          />
        ))}
        <label
          title="A colour of your own"
          // Unlike a swatch until one is chosen: dashed, with a dropper,
          // since a filled circle read as one more swatch.
          className={cn(
            SWATCH,
            "relative flex items-center justify-center overflow-hidden",
            ownColour ? PRESSED : "border-dashed bg-transparent",
          )}
          style={ownColour ? { backgroundColor: starting } : undefined}
        >
          <span className="sr-only">A colour of your own</span>
          {!ownColour && (
            <Pipette
              aria-hidden="true"
              className="pointer-events-none h-3 w-3 text-muted-foreground"
            />
          )}
          <input
            ref={custom}
            // A fresh input for each colour set elsewhere, so it opens on it.
            key={starting}
            type="color"
            defaultValue={starting}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      <Chooser
        options={WIDTH_OPTIONS}
        chosen={own.width === null ? AUTO : String(own.width)}
        onChange={(key) => {
          onChange({ ...own, width: key === AUTO ? null : Number(key) });
        }}
        label={`${label} thickness`}
      />
    </div>
  );
}
