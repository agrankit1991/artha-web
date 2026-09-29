/**
 * The news page: everything published, and ways to narrow it.
 *
 * The overview shows the first few of these; a page exists because a feed
 * is something a reader digs through. Three ways to narrow it - words, one
 * company, a window - which compose rather than replacing one another, and
 * all applied by the platform so a page of twelve is twelve of the matches
 * rather than twelve of the latest, filtered afterwards.
 */

import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { MentionedInstrument, NewsItem, NewsMention } from "@/api/client";
import { fetchNews, fetchNewsMentions } from "@/api/client";
import { Chip } from "@/components/Chip";
import { Chooser, type Option } from "@/components/Chooser";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { LeadArticle, NewsFeed } from "@/components/NewsFeed";
import { LoadMore } from "@/components/LoadMore";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
import { formatCount } from "@/lib/format";

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

/** How recent the news must be. */
type Within = "day" | "week" | "month" | "all";

/** The windows a reader switches between. */
const WINDOWS: Option<Within>[] = [
  { key: "day", label: "24h" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All" },
];

/** How many days back each window reaches; null for no limit. */
const DAYS: Record<Within, number | null> = { day: 1, week: 7, month: 30, all: null };

/**
 * Render the news page. The words, the window and the company are all in
 * the address, so a narrowed feed is a link.
 *
 * @returns The page.
 */
export function News(): React.JSX.Element {
  const [asked, setAsked] = useSearchParam("q");
  const [chosenWindow, setWithin] = useSearchParam("within", "all");
  const [companyKey, setCompanyKey] = useSearchParam("company");
  const within = WINDOWS.find((one) => one.key === chosenWindow)?.key ?? "all";
  const days = DAYS[within];
  // The box answers every keystroke; the address and the platform hear the
  // words once typing stops.
  const [typed, setTyped] = useState(asked);
  const text = useDebounced(typed);
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState<NewsItem[]>([]);

  useEffect(() => {
    // Compared first: the setter changes with every address, so writing
    // unconditionally would run this again after each write.
    if (text.trim() !== asked) {
      setAsked(text.trim());
    }
  }, [text, asked, setAsked]);

  // Any change to what is being asked for starts again at the beginning.
  // Keeping the articles already on screen would leave a reader looking at
  // a list that answers two different questions at once.
  useEffect(() => {
    setOffset(0);
  }, [text, days, companyKey]);

  const loadNews = useCallback(
    () =>
      fetchNews({
        text,
        days,
        instrumentKey: companyKey === "" ? null : companyKey,
        limit: offset === 0 ? BATCH + LEAD : BATCH,
        offset,
      }),
    [text, days, companyKey, offset],
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

  const choose = (mention: NewsMention): void => {
    setCompanyKey(mention.instrument_key);
  };
  const narrowed = text.trim() !== "" || within !== "all" || companyKey !== "";
  const nothing = page !== null && page.offset === 0 && page.items.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="News"
        count={
          page === null
            ? undefined
            : `${formatCount(page.total)} ${page.total === 1 ? "article" : "articles"}`
        }
        description="Everything the platform has collected, and the companies each article was published about. Choose a company's tag to read only its news."
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
              }}
              placeholder="Search headlines and summaries"
              aria-label="Search news"
              className="pl-8"
            />
          </div>
          <Chooser
            options={WINDOWS}
            chosen={within}
            onChange={setWithin}
            label="Published within"
          />
        </div>
        <CompanyFilter
          companyKey={companyKey}
          symbol={symbolOf(companyKey, mentions.data ?? [], shown)}
          offered={mentions.data ?? []}
          onChoose={choose}
          onClear={() => {
            setCompanyKey("");
          }}
        />
      </div>

      {news.error !== null ? (
        <Failed message={news.error} />
      ) : nothing ? (
        narrowed ? (
          <Empty
            title="No news matches"
            reason="Try other words, a longer window, or every company."
          />
        ) : (
          <Empty
            title="No news stored yet"
            reason="Articles appear here as the platform collects them."
          />
        )
      ) : (
        <>
          {shown.length > 0 && <LeadArticle item={shown[0] as NewsItem} onSelectMention={choose} />}
          <NewsFeed
            items={page === null && shown.length === 0 ? null : shown.slice(1)}
            loading={news.loading && shown.length === 0}
            onSelectMention={choose}
            // One article is the lead alone, not an empty feed under it.
            empty={null}
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
 * The symbol of the company the feed is narrowed to, from whichever list
 * names it: the most written about, or the articles on screen, which all
 * mention it. Its key's tail stands in until either arrives.
 *
 * @param key - The company's instrument key; empty for none.
 * @param offered - The companies most written about.
 * @param shown - The articles on screen.
 * @returns The symbol.
 */
function symbolOf(key: string, offered: MentionedInstrument[], shown: NewsItem[]): string {
  const known = [...offered, ...shown.flatMap((item) => item.mentions)].find(
    (one) => one.instrument_key === key,
  );
  return known?.symbol ?? key.slice(key.lastIndexOf("|") + 1);
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

/** Choosing one company's news, from the companies actually written about. */
function CompanyFilter({
  companyKey,
  symbol,
  offered,
  onChoose,
  onClear,
}: {
  companyKey: string;
  symbol: string;
  offered: MentionedInstrument[];
  onChoose: (company: NewsMention) => void;
  onClear: () => void;
}): React.JSX.Element | null {
  if (companyKey !== "") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Showing news about</span>
        <Chip removeLabel="Clear company filter" onRemove={onClear}>
          <span className="font-medium">{symbol}</span>
        </Chip>
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
