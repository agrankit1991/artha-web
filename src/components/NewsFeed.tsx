/**
 * The market's news, as cards.
 *
 * Each article carries the instruments it was published for. That is the
 * part a market platform adds over a news site: the same headline means
 * something different depending on whose price it moves.
 */

import { useState } from "react";

import type { NewsItem } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSince } from "@/lib/format";

interface NewsFeedProps {
  items: NewsItem[] | null;
  loading?: boolean;
  /** How many instrument tags to show before summarising the rest. */
  tagLimit?: number;
}

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
}: NewsFeedProps): React.JSX.Element {
  if (items === null || items.length === 0) {
    return loading ? (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((slot) => (
          <Card key={slot}>
            <CardContent className="space-y-2">
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Article key={item.url} item={item} tagLimit={tagLimit} />
      ))}
    </div>
  );
}

/** One article. */
function Article({ item, tagLimit }: { item: NewsItem; tagLimit: number }): React.JSX.Element {
  const shown = item.mentions.slice(0, tagLimit);
  const hidden = item.mentions.length - shown.length;

  return (
    <Card className="h-full gap-0 overflow-hidden pt-0 transition-colors hover:bg-muted/50">
      <Thumbnail url={item.thumbnail_url} />
      <CardContent className="flex h-full flex-col gap-2 pt-4">
        <a
          href={item.url}
          target="_blank"
          // Without noreferrer the opened page can reach back through
          // `window.opener`; noopener alone still leaks the referrer.
          rel="noopener noreferrer"
          className="font-medium leading-snug hover:underline"
        >
          {item.headline}
        </a>
        {item.summary !== "" && (
          <p className="line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
          {shown.map((mention) => (
            <Badge key={mention.instrument_key} variant="secondary" className="text-xs">
              {mention.symbol}
            </Badge>
          ))}
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
    <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
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
