/**
 * The news page: everything published, and ways to narrow it.
 *
 * The overview shows the first few of these; a page exists because a feed
 * is something a reader digs through. Three ways to narrow it — words, one
 * company, a window — which compose rather than replacing one another, and
 * all applied by the platform so a page of twelve is twelve of the matches
 * rather than twelve of the latest, filtered afterwards.
 */

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { MentionedInstrument, NewsItem } from "@/api/client";
import { fetchNews, fetchNewsMentions } from "@/api/client";
import { NewsFeed } from "@/components/NewsFeed";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { formatSince } from "@/lib/format";

/** Articles a page carries. */
const PER_PAGE = 12;

/** The windows a reader switches between. */
const WINDOWS: { label: string; days: number | null }[] = [
  { label: "24h", days: 1 },
  { label: "Week", days: 7 },
  { label: "Month", days: 30 },
  { label: "All", days: null },
];

/**
 * Render the news page.
 *
 * @returns The page.
 */
export function News(): React.JSX.Element {
  const [typed, setTyped] = useState("");
  const [days, setDays] = useState<number | null>(null);
  const [company, setCompany] = useState<MentionedInstrument | null>(null);
  const [offset, setOffset] = useState(0);
  const text = useDebounced(typed);

  // Any change to what is being asked for starts again at the first page:
  // staying on page four of a result that now has two is how a reader ends
  // up looking at an empty page and concluding there is nothing.
  useEffect(() => {
    setOffset(0);
  }, [text, days, company]);

  const loadNews = useCallback(
    () =>
      fetchNews({
        text,
        days,
        instrumentKey: company?.instrument_key ?? null,
        limit: PER_PAGE,
        offset,
      }),
    [text, days, company, offset],
  );
  const loadMentions = useCallback(() => fetchNewsMentions(days), [days]);

  const news = useResource(loadNews);
  const mentions = useResource(loadMentions);

  const page = news.data;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Market news</h1>
          <p className="text-sm text-muted-foreground">
            Everything the platform has collected, and what it was published about.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
              }}
              placeholder="Search headlines and summaries"
              aria-label="Search news"
              className="pl-8"
            />
          </div>
          <div className="flex gap-1" role="group" aria-label="Published within">
            {WINDOWS.map((window) => (
              <Button
                key={window.label}
                size="sm"
                variant={window.days === days ? "secondary" : "ghost"}
                aria-pressed={window.days === days}
                onClick={() => {
                  setDays(window.days);
                }}
              >
                {window.label}
              </Button>
            ))}
          </div>
        </div>

        <CompanyFilter company={company} offered={mentions.data ?? []} onChoose={setCompany} />
      </header>

      {news.error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {news.error}
        </p>
      ) : (
        <>
          {page !== null && page.offset === 0 && page.items.length > 0 && (
            <Lead item={page.items[0] as NewsItem} />
          )}
          <NewsFeed
            items={page === null ? null : rest(page.items, page.offset)}
            loading={news.loading}
          />
          {page !== null && (
            <Pagination
              offset={page.offset}
              limit={page.limit}
              total={page.total}
              onChange={setOffset}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * The articles the grid shows, once the lead has taken one.
 *
 * @param items - The page's articles.
 * @param offset - How many were skipped to reach the page.
 * @returns The articles to lay out in the grid.
 */
function rest(items: NewsItem[], offset: number): NewsItem[] {
  // Only the first page has a lead. A "featured" article on page five is
  // whatever happened to sort there, which is not a feature.
  return offset === 0 ? items.slice(1) : items;
}

/** The newest article, given the room its picture deserves. */
function Lead({ item }: { item: NewsItem }): React.JSX.Element {
  return (
    <Card className="overflow-hidden pt-0">
      <div className="grid md:grid-cols-2">
        {item.thumbnail_url !== null && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted md:aspect-auto md:h-full">
            <img
              src={item.thumbnail_url}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardContent className="flex flex-col gap-3 pt-6">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-semibold leading-snug hover:underline"
          >
            {item.headline}
          </a>
          <p className="text-sm text-muted-foreground">{item.summary}</p>
          <div className="mt-auto flex flex-wrap items-center gap-1">
            {item.mentions.map((mention) => (
              <Badge key={mention.instrument_key} variant="secondary" className="text-xs">
                {mention.symbol}
              </Badge>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatSince(item.published_at)}
            </span>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

/** Choosing one company's news, from the companies actually written about. */
function CompanyFilter({
  company,
  offered,
  onChoose,
}: {
  company: MentionedInstrument | null;
  offered: MentionedInstrument[];
  onChoose: (company: MentionedInstrument | null) => void;
}): React.JSX.Element | null {
  if (company !== null) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Showing news about</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            onChoose(null);
          }}
        >
          {company.symbol}
          <X className="h-3 w-3" />
          <span className="sr-only">Clear company filter</span>
        </Button>
      </div>
    );
  }

  if (offered.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Most written about</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Companies in the news">
        {offered.map((mentioned) => (
          <Button
            key={mentioned.instrument_key}
            size="sm"
            variant="ghost"
            title={mentioned.name}
            onClick={() => {
              onChoose(mentioned);
            }}
          >
            {mentioned.symbol}
            <span className="ml-1 text-xs text-muted-foreground">{mentioned.articles}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
