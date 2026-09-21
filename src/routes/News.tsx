/**
 * The news page: everything published, and ways to narrow it.
 *
 * The overview shows the first few of these; a page exists because a feed
 * is something a reader digs through. Three ways to narrow it — words, one
 * company, a window — which compose rather than replacing one another, and
 * all applied by the platform so a page of twelve is twelve of the matches
 * rather than twelve of the latest, filtered afterwards.
 */

import { Newspaper, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { MentionedInstrument, NewsItem, NewsMention } from "@/api/client";
import { fetchNews, fetchNewsMentions } from "@/api/client";
import { NewsFeed } from "@/components/NewsFeed";
import { LoadMore } from "@/components/LoadMore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { formatSince } from "@/lib/format";

/**
 * Articles the grid gains with each press of "Load more".
 *
 * A multiple of three, because the grid is three across: anything else
 * leaves the last row part-empty every single time.
 */
const BATCH = 12;

/**
 * The newest article, which is shown above the grid rather than in it.
 *
 * The first request therefore asks for one more than a batch, so that what
 * lands in the grid is still a whole number of rows.
 */
const LEAD = 1;

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
  const [company, setCompany] = useState<NewsMention | null>(null);
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState<NewsItem[]>([]);
  const text = useDebounced(typed);

  // Any change to what is being asked for starts again at the beginning.
  // Keeping the articles already on screen would leave a reader looking at
  // a list that answers two different questions at once.
  useEffect(() => {
    setOffset(0);
  }, [text, days, company]);

  const loadNews = useCallback(
    () =>
      fetchNews({
        text,
        days,
        instrumentKey: company?.instrument_key ?? null,
        limit: offset === 0 ? BATCH + LEAD : BATCH,
        offset,
      }),
    [text, days, company, offset],
  );
  const loadMentions = useCallback(() => fetchNewsMentions(days), [days]);

  const news = useResource(loadNews);
  const mentions = useResource(loadMentions);
  const page = news.data;

  // A batch from the beginning replaces what is on screen; any other batch
  // is added under it. Merged by link rather than appended blindly, so a
  // batch that arrives twice -- which React's strict mode makes happen in
  // development -- does not show every article twice.
  useEffect(() => {
    if (page === null) {
      return;
    }
    setShown((held) => (page.offset === 0 ? page.items : merge(held, page.items)));
  }, [page]);

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Newspaper className="h-5 w-5 text-primary" />
            Market News
          </h1>
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
          {shown.length > 0 && <Lead item={shown[0] as NewsItem} onSelectMention={setCompany} />}
          <NewsFeed
            items={page === null && shown.length === 0 ? null : shown.slice(1)}
            loading={news.loading && shown.length === 0}
            onSelectMention={setCompany}
          />
          {page !== null && (
            <LoadMore
              shown={shown.length}
              total={page.total}
              loading={news.loading}
              onMore={() => {
                setOffset(shown.length);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Add a batch to what is already on screen, without repeating anything.
 *
 * @param held - The articles already shown.
 * @param arriving - The batch that has just come back.
 * @returns The two together, in order, each article once.
 */
function merge(held: NewsItem[], arriving: NewsItem[]): NewsItem[] {
  const known = new Set(held.map((item) => item.url));
  return [...held, ...arriving.filter((item) => !known.has(item.url))];
}

/** The newest article, given the room its picture deserves. */
function Lead({
  item,
  onSelectMention,
}: {
  item: NewsItem;
  onSelectMention: (mention: NewsMention) => void;
}): React.JSX.Element {
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
  company: NewsMention | null;
  offered: MentionedInstrument[];
  onChoose: (company: NewsMention | null) => void;
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
