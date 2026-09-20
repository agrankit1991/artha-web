/**
 * The market's news, as cards.
 *
 * Each article carries the instruments it was published for. That is the
 * part a market platform adds over a news site: the same headline means
 * something different depending on whose price it moves.
 */

import { useState } from "react";

import type { NewsItem, NewsMention } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/Tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSince } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NewsFeedProps {
  items: NewsItem[] | null;
  loading?: boolean;
  /** How many instrument tags to show before summarising the rest. */
  tagLimit?: number;
  /**
   * What to do when an instrument tag is chosen. Given one, the tags
   * become buttons; without one they stay as labels, because a tag that
   * looks pressable and does nothing is worse than a tag that does not.
   */
  onSelectMention?: (mention: NewsMention) => void;
}

/**
 * How tall an article's picture is drawn.
 *
 * A fixed height rather than an aspect ratio, deliberately. A ratio makes
 * the picture as tall as the column is wide, so the same card is half a
 * screen high on a wide display and the text under it is pushed out of
 * sight. A height keeps every card the same size whatever the column count.
 */
const PICTURE = "h-44";

/**
 * How the cards are laid out.
 *
 * Three across at most, and never four. Every count this application asks
 * for is a multiple of three -- six on the overview, twelve to a batch on
 * the news page -- so a grid of three always ends flush, and a grid of
 * four would leave two thirds of a row empty at the bottom of both.
 */
const GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

/**
 * Render the feed.
 *
 * @param props - The articles, and whether they are still arriving.
 * @returns The feed.
 */
export function NewsFeed({
  items,
  loading = false,
  tagLimit = 4,
  onSelectMention,
}: NewsFeedProps): React.JSX.Element {
  if (items === null || items.length === 0) {
    return loading ? (
      <div className={GRID}>
        {[0, 1, 2].map((slot) => (
          <Card key={slot} className="gap-0 overflow-hidden py-0">
            <Skeleton className={cn(PICTURE, "w-full rounded-b-none")} />
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">No news stored yet</p>
    );
  }

  return (
    <div className={GRID}>
      {items.map((item) => (
        <Article
          key={item.url}
          item={item}
          tagLimit={tagLimit}
          {...(onSelectMention ? { onSelectMention } : {})}
        />
      ))}
    </div>
  );
}

/** One article. */
function Article({
  item,
  tagLimit,
  onSelectMention,
}: {
  item: NewsItem;
  tagLimit: number;
  onSelectMention?: (mention: NewsMention) => void;
}): React.JSX.Element {
  const shown = item.mentions.slice(0, tagLimit);
  const hidden = item.mentions.length - shown.length;

  return (
    // Not `overflow-hidden`: the summary's tooltip has to be able to reach
    // past the bottom of the card. The picture clips itself instead.
    <Card className="h-full gap-0 py-0 transition-colors hover:bg-muted/50">
      <Thumbnail url={item.thumbnail_url} />
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <a
          href={item.url}
          target="_blank"
          // Without noreferrer the opened page can reach back through
          // `window.opener`; noopener alone still leaks the referrer.
          rel="noopener noreferrer"
          className="line-clamp-2 font-medium leading-snug hover:underline"
        >
          {item.headline}
        </a>
        {item.summary !== "" && (
          <Tooltip content={item.summary}>
            <span className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {item.summary}
            </span>
          </Tooltip>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-0.5">
          {shown.map((mention) =>
            onSelectMention ? (
              <button
                key={mention.instrument_key}
                type="button"
                title={`Show only news about ${mention.symbol}`}
                onClick={() => {
                  onSelectMention(mention);
                }}
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground"
                >
                  {mention.symbol}
                </Badge>
              </button>
            ) : (
              <Badge key={mention.instrument_key} variant="secondary" className="text-xs">
                {mention.symbol}
              </Badge>
            ),
          )}
          {hidden > 0 && <span className="text-xs text-muted-foreground">+{hidden} more</span>}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatSince(item.published_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * An article's picture, where the publisher gave one.
 *
 * A fixed aspect box rather than the image's own shape, so a row of cards
 * does not step up and down with whatever the publisher happened to crop
 * to. The referrer is withheld: fetching the picture should not tell the
 * publisher which page of this application somebody is reading.
 *
 * @param props - The link to the picture.
 * @returns The picture, or nothing at all when there is none to show.
 */
function Thumbnail({ url }: { url: string | null }): React.JSX.Element | null {
  const [broken, setBroken] = useState(false);

  if (url === null || broken) {
    // Nothing rather than a placeholder: a card with no picture reads as a
    // card with no picture, while a grey box reads as one still loading.
    return null;
  }

  return (
    <div className={cn(PICTURE, "w-full shrink-0 overflow-hidden rounded-t-xl bg-muted")}>
      <img
        src={url}
        // The headline is right beside it and says the same thing, so
        // announcing the picture as well would read it twice.
        alt=""
        aria-hidden="true"
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
        onError={() => {
          setBroken(true);
        }}
      />
    </div>
  );
}
