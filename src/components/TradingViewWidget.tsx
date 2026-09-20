/**
 * An embedded TradingView widget.
 *
 * These show TradingView's data, not this platform's, and that is the
 * whole reason to be careful with them: a chart of prices this platform
 * also holds would sooner or later disagree with a signal fired on the
 * stored ones, and the disagreement would be blamed on the rule engine.
 *
 * So they are for what this platform has no data for at all -- world
 * markets, a live heatmap, anything intraday. Everything drawn from stored
 * bars uses `PriceChart` or `ComparisonChart`.
 *
 * The embed is a script tag that replaces itself with an iframe, which is
 * TradingView's own documented mechanism; there is no package for it.
 */

import { useEffect, useRef } from "react";

import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface TradingViewWidgetProps {
  /** Which embed, as the filename TradingView publishes it under. */
  widget: string;
  /** The widget's own settings, passed through as its JSON configuration. */
  settings: Record<string, unknown>;
  /** What the panel is, for a reader who cannot see it. */
  label: string;
  height?: number;
  className?: string;
}

const EMBED_HOST = "https://s3.tradingview.com/external-embedding";

/**
 * Mount one widget, and remount it when the theme changes.
 *
 * @param props - Which widget, its settings, and how tall to draw it.
 * @returns The panel the widget loads into.
 */
export function TradingViewWidget({
  widget,
  settings,
  label,
  height = 400,
  className,
}: TradingViewWidgetProps): React.JSX.Element {
  const holder = useRef<HTMLDivElement>(null);
  const { appearance } = useTheme();
  // Serialised rather than passed by identity: a settings object rebuilt
  // on every render would tear the widget down and load it again on every
  // render with it.
  const configured = JSON.stringify(settings);

  useEffect(() => {
    const element = holder.current;
    if (element === null) {
      return undefined;
    }

    element.innerHTML = "";
    const script = document.createElement("script");
    script.src = `${EMBED_HOST}/embed-widget-${widget}.js`;
    script.async = true;
    script.innerHTML = JSON.stringify({
      ...(JSON.parse(configured) as Record<string, unknown>),
      colorTheme: appearance,
      width: "100%",
      height,
    });
    element.appendChild(script);

    return () => {
      // The widget leaves an iframe behind; emptying the holder is what
      // stops a second one appearing beside it on the next change.
      element.innerHTML = "";
    };
  }, [widget, configured, appearance, height]);

  return (
    <div
      role="region"
      aria-label={label}
      className={cn("overflow-hidden rounded-lg border bg-card", className)}
    >
      <div ref={holder} style={{ height }} />
      {/* TradingView ask for attribution wherever a widget is embedded,
          and it is theirs to ask: the data in these two is theirs, not
          this platform's. */}
      <div className="border-t px-3 py-1.5 text-right text-xs text-muted-foreground">
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener nofollow"
          className="hover:underline"
        >
          Track all markets on TradingView
        </a>
      </div>
    </div>
  );
}
