/**
 * The market's news, as cards.
 *
 * Each article carries the instruments it was published for. That is the
 * part a market platform adds over a news site: the same headline means
 * something different depending on whose price it moves.
 */

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
    <Card className="h-full transition-colors hover:bg-muted/50">
      <CardContent className="flex h-full flex-col gap-2">
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
