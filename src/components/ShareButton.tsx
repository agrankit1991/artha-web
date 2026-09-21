/**
 * A picture of one instrument's day, to copy or keep.
 *
 * The button opens a dialog with the card drawn on a canvas -- name,
 * price, the day's move, a month's line -- and two things to do with it:
 * copy this page's link, or download the picture. The drawing is
 * `drawShareCard`'s; this component owns only the canvas, the clipboard
 * and the download, and says plainly when the browser refuses any of
 * them rather than failing quietly.
 *
 * The month's closes are fetched when the dialog opens, not when the
 * page loads: a share is rare and a page load is not.
 */

import { Check, Copy, Download, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/ui/button";
import { CARD_HEIGHT, CARD_WIDTH, type CardFacts, drawShareCard } from "@/lib/shareCard";

interface ShareButtonProps {
  /** What the card says, apart from the line. */
  facts: Omit<CardFacts, "points" | "brand">;
  /** The month's closes, fetched when the dialog opens. */
  loadPoints: () => Promise<number[]>;
  /** What the picture is saved as, without the extension. */
  filename: string;
  className?: string;
}

const BRAND = "Artha Science";

/**
 * Render the button and, while open, the card.
 *
 * @param props - The facts, where the line comes from, and the file's name.
 * @returns The button.
 */
export function ShareButton({
  facts,
  loadPoints,
  filename,
  className,
}: ShareButtonProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState<number[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setCopied(false);
  }, []);

  // The line arrives once per opening; the card is drawn when it does.
  useEffect(() => {
    if (!open) {
      return;
    }
    let live = true;
    setPoints(null);
    setProblem(null);
    loadPoints()
      .then((found) => {
        if (live) {
          setPoints(found);
        }
      })
      .catch((error: unknown) => {
        if (live) {
          setPoints([]);
          setProblem(
            error instanceof Error ? error.message : "The month's closes could not be read",
          );
        }
      });
    return () => {
      live = false;
    };
  }, [open, loadPoints]);

  useEffect(() => {
    if (!open || points === null || canvas.current === null) {
      return;
    }
    const context = canvas.current.getContext("2d");
    if (context === null) {
      setProblem("This browser cannot draw the card.");
      return;
    }
    drawShareCard(context, { ...facts, points, brand: BRAND });
  }, [open, points, facts]);

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setProblem("The browser refused the clipboard; copy the address bar instead.");
    }
  };

  const download = (): void => {
    const element = canvas.current;
    if (element === null) {
      return;
    }
    element.toBlob((blob) => {
      if (blob === null) {
        setProblem("The browser could not make the picture.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        {...(className === undefined ? {} : { className })}
        onClick={() => {
          setOpen(true);
        }}
      >
        <Share2 aria-hidden="true" className="mr-1.5 h-4 w-4" />
        Share
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Share"
        description="A picture of today, and this page's link."
        className="max-w-2xl"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void copyLink();
              }}
            >
              {copied ? (
                <Check aria-hidden="true" className="mr-1.5 h-4 w-4" />
              ) : (
                <Copy aria-hidden="true" className="mr-1.5 h-4 w-4" />
              )}
              {copied ? "Link copied" : "Copy link"}
            </Button>
            <Button disabled={points === null} onClick={download}>
              <Download aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Download image
            </Button>
          </>
        }
      >
        <canvas
          ref={canvas}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          role="img"
          aria-label={`${facts.title}: ${facts.price}, ${facts.changeText}`}
          className="aspect-[1200/630] w-full rounded-md border"
        />
        {points === null && problem === null && (
          <p className="text-xs text-muted-foreground">Drawing…</p>
        )}
        {problem !== null && <p className="text-sm text-loss">{problem}</p>}
      </Dialog>
    </>
  );
}
