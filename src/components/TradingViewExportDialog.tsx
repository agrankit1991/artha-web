/**
 * A list on any page, as a TradingView watchlist.
 *
 * The dialog holds the list as TradingView reads it -- `NSE:RELIANCE,NSE:TCS`
 * -- ready to paste into a watchlist's Add symbol box, or to download as the
 * `.txt` file TradingView's "Import list" takes. Opened from `ListActions`,
 * which every list in the application offers, so what is looked up, how it
 * is cut up and what is said when something could not be found are decided
 * here once.
 *
 * A watchlist holds only so many symbols, and how many depends on the
 * reader's plan on whichever platform they use, so a long list is cut into
 * parts of a size they choose (and which is remembered). Each part is copied
 * or downloaded on its own.
 *
 * The symbols are looked up when the dialog opens, not when the page loads:
 * an export is rare and a page load is not.
 */

import { Check, Copy, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Chooser } from "@/components/Chooser";
import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/ui/button";
import { formatWhole } from "@/lib/format";
import type { KeyCollection } from "@/lib/keySource";
import { EXPORT_SIZES, type ExportSize, usePreferences, writePreferences } from "@/lib/preferences";
import { MOST_EXPORTED, type Symbols, listText, partsOf, symbolsFor } from "@/lib/tradingViewList";

interface TradingViewExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** What the list is, said under the title. */
  label: string;
  /** The list's instruments, as far as they have been collected. */
  collection: KeyCollection;
}

type Looked =
  { phase: "loading" } | { phase: "ready"; found: Symbols } | { phase: "failed"; message: string };

/**
 * Render the dialog.
 *
 * @param props - Whether it is open, and the list.
 * @returns The dialog.
 */
export function TradingViewExportDialog({
  open,
  onClose,
  label,
  collection,
}: TradingViewExportDialogProps): React.JSX.Element {
  const { exportSize: size } = usePreferences();
  const [looked, setLooked] = useState<Looked>({ phase: "loading" });
  const [part, setPart] = useState(0);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const text = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setPart(0);
    setCopied(false);
    setProblem(null);
    if (collection.phase !== "ready") {
      setLooked(
        collection.phase === "failed"
          ? { phase: "failed", message: collection.message }
          : { phase: "loading" },
      );
      return undefined;
    }
    // An answer arriving after the dialog closed, or after a newer list,
    // must not be drawn over what is now open.
    let current = true;
    setLooked({ phase: "loading" });
    symbolsFor(collection.collected.keys)
      .then((found) => {
        if (current) {
          setLooked({ phase: "ready", found });
        }
      })
      .catch((error: unknown) => {
        if (current) {
          setLooked({
            phase: "failed",
            message:
              error instanceof Error ? error.message : "TradingView's symbols could not be read",
          });
        }
      });
    return () => {
      current = false;
    };
  }, [open, collection]);

  const choose = (next: ExportSize): void => {
    writePreferences({ exportSize: next });
    setPart(0);
    setCopied(false);
    setProblem(null);
  };

  const found = looked.phase === "ready" ? looked.found : null;
  const total = found?.symbols.length ?? 0;
  const parts = found === null ? [] : partsOf(found.symbols, size);
  const each = size === "all" ? total : Number(size);
  // Choosing a size returns to the first part, so the part is always one that exists.
  const shown = parts[part];
  const count = shown?.length ?? 0;
  const written = shown === undefined ? "" : listText(shown);
  const first = part * each + 1;
  const over = collection.phase === "ready" && collection.collected.over;

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(written);
      setCopied(true);
      setProblem(null);
    } catch {
      // No clipboard on a page served without HTTPS, or refused outright.
      text.current?.select();
      setProblem("The browser refused the clipboard. The symbols are selected: press Ctrl+C.");
    }
  };

  const download = (): void => {
    const address = URL.createObjectURL(new Blob([written], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = address;
    link.download = fileName(label, parts.length > 1 ? part + 1 : null);
    link.click();
    URL.revokeObjectURL(address);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Copy for TradingView"
      description={`${label}. Paste it into a watchlist's Add symbol (+) box, or download it for Import list.`}
      className="max-w-2xl"
      actions={
        <>
          <Button variant="outline" disabled={shown === undefined} onClick={download}>
            <Download aria-hidden="true" />
            Download .txt
          </Button>
          <Button
            disabled={shown === undefined}
            onClick={() => {
              void copy();
            }}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied
              ? `Copied ${formatWhole(count)}`
              : `Copy ${formatWhole(count)} ${count === 1 ? "symbol" : "symbols"}`}
          </Button>
        </>
      }
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Symbols per list
        </p>
        <Chooser
          options={EXPORT_SIZES.map((one) => ({
            key: one,
            label: one === "all" ? "All" : formatWhole(Number(one)),
          }))}
          chosen={size}
          onChange={choose}
          label="Symbols per list"
        />
        <p className="text-xs text-muted-foreground">
          A watchlist holds only so many, by your plan. A longer list is cut into parts, each copied
          on its own.
        </p>
      </div>

      {parts.length > 1 && (
        <Chooser
          options={parts.map((one, at) => ({
            key: String(at),
            label: `${formatWhole(at * each + 1)}-${formatWhole(at * each + one.length)}`,
          }))}
          chosen={String(part)}
          onChange={(next) => {
            setPart(Number(next));
            setCopied(false);
            setProblem(null);
          }}
          label="Part"
        />
      )}

      {looked.phase === "loading" && (
        <p className="text-sm text-muted-foreground">Looking up TradingView&apos;s symbols…</p>
      )}
      {looked.phase === "failed" && <p className="text-sm text-destructive">{looked.message}</p>}
      {looked.phase === "ready" &&
        (shown === undefined ? (
          <p className="text-sm text-muted-foreground">
            TradingView has no symbol for anything on this list.
          </p>
        ) : (
          <textarea
            ref={text}
            readOnly
            rows={6}
            value={written}
            aria-label="Symbols for TradingView"
            onFocus={(event) => {
              event.currentTarget.select();
            }}
            className="w-full rounded-md border bg-background p-2 font-mono text-xs"
          />
        ))}

      {found !== null && shown !== undefined && (
        <p className="text-xs text-muted-foreground">
          {parts.length > 1
            ? `Part ${String(part + 1)} of ${String(parts.length)}: symbols ${formatWhole(first)}-${formatWhole(first + count - 1)} of ${formatWhole(total)}.`
            : `${formatWhole(total)} ${total === 1 ? "symbol" : "symbols"}.`}
        </p>
      )}
      {found !== null && found.missing > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatWhole(found.missing)} left out: TradingView has no symbol for{" "}
          {found.missing === 1 ? "it" : "them"}.
        </p>
      )}
      {found !== null && found.unconfirmed > 0 && (
        <p className="text-xs text-caution">
          {formatWhole(found.unconfirmed)} {found.unconfirmed === 1 ? "was" : "were"} worked out
          from the ticker, not confirmed, and TradingView may not know{" "}
          {found.unconfirmed === 1 ? "it" : "them"}.
        </p>
      )}
      {over && (
        <p className="text-xs text-caution">
          Only the first {formatWhole(MOST_EXPORTED)} of a longer list are taken.
        </p>
      )}
      {problem !== null && <p className="text-sm text-destructive">{problem}</p>}
    </Dialog>
  );
}

/**
 * Name a downloaded list after what it is, as TradingView names the list
 * it imports after the file.
 *
 * @param label - What the list is.
 * @param part - Which part, when the list was cut into several.
 * @returns A file name of letters, digits and hyphens, ending `.txt`.
 */
export function fileName(label: string, part: number | null): string {
  const stem =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "watchlist";
  return part === null ? `${stem}.txt` : `${stem}-${String(part)}.txt`;
}
