/**
 * Finding one thing that has a page, by typing part of its name.
 *
 * One picker behind every search box: the header's, the one that adds to a
 * comparison and the one that adds to a watchlist. It was three, and only
 * the header's could be driven by the keyboard. Keyboard first here: the
 * arrows move through what was found, Enter takes it, Escape puts the list
 * away; the pointer works too.
 *
 * The platform ranks; this only shows. A company, an index, a sector and a
 * fund each carry the icon they carry everywhere else, so a reader knows
 * what kind of thing they are about to choose.
 */

import { Search } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import type { SearchHit } from "@/api/client";
import { fetchSearch } from "@/api/client";
import { Delta } from "@/components/Delta";
import { Badge } from "@/components/ui/badge";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { ENTITIES } from "@/lib/entities";
import { formatPrice } from "@/lib/format";
import { categoryLabel } from "@/lib/indices";
import { cn } from "@/lib/utils";

/** The kinds of thing a search can find. */
export type SearchKind = SearchHit["kind"];

interface InstrumentPickerProps {
  /** What the box is for, for a reader who cannot see it. */
  label: string;
  placeholder: string;
  /** Called with what was chosen; the box empties itself afterwards. */
  onPick: (hit: SearchHit) => void;
  /** Which kinds of thing it finds; every kind unless it says. */
  kinds?: readonly SearchKind[];
  /** Keys already chosen, left out of what is offered. */
  excluded?: readonly string[];
  /** What to offer before anything is typed, under a heading: recent choices. */
  suggestions?: { heading: string; hits: SearchHit[] };
  /**
   * Where the matches appear: under the box as a list that closes
   * (a header, a toolbar), or in the flow of the page (a dialog).
   */
  layout?: "popover" | "inline";
  /** The input, for a caller that focuses it from elsewhere (a shortcut). */
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
  /** Classes for the input itself, for a box on the chrome rather than the page. */
  inputClassName?: string;
}

/**
 * Render the picker.
 *
 * @param props - What it finds, what to do with a choice, and how it looks.
 * @returns The box, with its matches.
 */
export function InstrumentPicker({
  label,
  placeholder,
  onPick,
  kinds,
  excluded = [],
  suggestions,
  layout = "popover",
  inputRef,
  className,
  inputClassName,
}: InstrumentPickerProps): React.JSX.Element {
  const listId = useId();
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = useDebounced(typed.trim());
  const searching = query.length >= 2;

  const load = useCallback(
    () => (searching ? fetchSearch(query) : Promise.resolve<SearchHit[]>([])),
    [query, searching],
  );
  const found = useResource(load);

  // What is listed: what was found for the letters typed, of the kinds
  // asked for and not already chosen, or the suggestions before that.
  const hits = (searching ? (found.data ?? []) : (suggestions?.hits ?? [])).filter(
    (hit) => (kinds === undefined || kinds.includes(hit.kind)) && !excluded.includes(hit.key),
  );

  // Back to the top whenever what is listed changes under the cursor: an
  // index into the previous list means nothing in the next one. Keyed on
  // the matches themselves, not on the array, which is new every render and
  // would put the cursor back at the top after every arrow press.
  const listed = hits.map((hit) => `${hit.kind}:${hit.key}`).join("|");
  useEffect(() => {
    setActive(0);
  }, [listed]);

  const pick = (hit: SearchHit): void => {
    setTyped("");
    setOpen(false);
    onPick(hit);
  };

  const onKey = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((at) => Math.min(at + 1, Math.max(hits.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((at) => Math.max(at - 1, 0));
    } else if (event.key === "Enter") {
      const hit = hits[active];
      if (hit !== undefined) {
        event.preventDefault();
        pick(hit);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      event.currentTarget.blur();
    }
  };

  const inline = layout === "inline";
  const showing = (inline || open) && (hits.length > 0 || (searching && !found.loading));

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={label}
          aria-expanded={showing}
          aria-controls={listId}
          aria-activedescendant={
            showing && hits[active] !== undefined ? `${listId}-${String(active)}` : undefined
          }
          aria-autocomplete="list"
          aria-busy={searching && found.loading}
          autoComplete="off"
          placeholder={placeholder}
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          // Closed on the next tick rather than at once, so a click on a
          // match lands before the list it is in disappears.
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
            }, 150);
          }}
          onKeyDown={onKey}
          className={cn(
            "h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40",
            inputClassName,
          )}
        />
      </div>
      {showing && (
        <ul
          id={listId}
          role="listbox"
          aria-label={searching ? "Results" : (suggestions?.heading ?? "Results")}
          className={cn(
            "overflow-auto rounded-md border bg-popover p-1 text-popover-foreground",
            inline
              ? "mt-2 max-h-72"
              : "absolute left-0 right-0 top-full z-50 mt-1 max-h-96 shadow-lg motion-safe:animate-surface-in",
          )}
        >
          {!searching && suggestions !== undefined && hits.length > 0 && (
            <li className="px-2 py-1 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
              {suggestions.heading}
            </li>
          )}
          {hits.length === 0 ? (
            <li className="px-2 py-3 text-center text-sm text-muted-foreground">
              Nothing called &ldquo;{query}&rdquo;
            </li>
          ) : (
            hits.map((hit, position) => {
              const Mark = ENTITIES[hit.kind].icon;
              return (
                <li
                  key={`${hit.kind}:${hit.key}`}
                  id={`${listId}-${String(position)}`}
                  role="option"
                  aria-selected={position === active}
                  onMouseDown={(event) => {
                    // Before the input's blur, which would otherwise close
                    // the list under the pointer.
                    event.preventDefault();
                    pick(hit);
                  }}
                  onMouseEnter={() => {
                    setActive(position);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm",
                    position === active ? "bg-accent text-accent-foreground" : "",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Mark aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <HitRow hit={hit} />
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * One match, laid out as the previous project's search did: the name,
 * then the badges that say what and where it is, then how it last closed.
 *
 * A company shows its symbol and full name with a badge per exchange it
 * trades on; an index its category; everything its kind. The close is
 * shown for whatever has one, so a reader can often stop at the match
 * without opening the page.
 *
 * @param props - The match.
 * @returns The row's content.
 */
function HitRow({ hit }: { hit: SearchHit }): React.JSX.Element {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium">{hit.label}</span>
          {hit.exchanges.map((exchange) => (
            <Badge
              key={exchange}
              variant="outline"
              className="h-4 shrink-0 bg-primary/5 px-1 py-0 font-mono text-micro"
            >
              {exchange}
            </Badge>
          ))}
          {hit.category !== null && (
            <Badge variant="outline" className="h-4 shrink-0 px-1 py-0 text-micro">
              {categoryLabel(hit.category)}
            </Badge>
          )}
          {hit.kind !== "company" && (
            <Badge variant="secondary" className="h-4 shrink-0 px-1 py-0 text-micro">
              {ENTITIES[hit.kind].label}
            </Badge>
          )}
        </span>
        {hit.detail !== null && (
          <span className="block truncate text-xs text-muted-foreground">{hit.detail}</span>
        )}
      </span>
      {hit.close !== null && (
        <span className="flex shrink-0 flex-col items-end text-xs">
          <span className="tabular font-medium">{formatPrice(hit.close)}</span>
          <Delta value={hit.change_percent} />
        </span>
      )}
    </>
  );
}
