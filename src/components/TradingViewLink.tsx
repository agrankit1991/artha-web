/**
 * The way out to an instrument's chart on TradingView.
 *
 * This platform holds end-of-day bars and nothing intraday, so "what is it
 * doing right now" is a question it cannot answer and TradingView can.
 * The symbol comes from the weekly job that records what each outside
 * service calls our instruments, so the link is to the right chart rather
 * than to a search for a ticker that might mean something else there.
 */

import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

interface TradingViewLinkProps {
  /** What to call the instrument. */
  label: string;
  /** What TradingView calls it, when this platform knows. */
  symbol?: string | undefined;
  /** Whether that symbol was guessed from the ticker rather than confirmed. */
  derived?: boolean | undefined;
  className?: string;
}

/**
 * Render the link, or nothing when there is nowhere to send a reader.
 *
 * @param props - The instrument and its symbol.
 * @returns The link, or null when the symbol is unknown.
 */
export function TradingViewLink({
  label,
  symbol,
  derived = false,
  className,
}: TradingViewLinkProps): React.JSX.Element | null {
  if (symbol === undefined || symbol === "") {
    // No link at all rather than a guess at the symbol: a link to the
    // wrong instrument's chart is worse than none, because nothing about
    // it looks wrong.
    return null;
  }

  return (
    <a
      href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`}
      target="_blank"
      rel="noopener noreferrer"
      title={
        derived
          ? `${label} on TradingView. This symbol was worked out from the ticker and may not exist there.`
          : `${label} on TradingView`
      }
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline",
        className,
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3" />
      {derived && <span aria-hidden="true">?</span>}
      <span className="sr-only">on TradingView{derived ? ", symbol unconfirmed" : ""}</span>
    </a>
  );
}
