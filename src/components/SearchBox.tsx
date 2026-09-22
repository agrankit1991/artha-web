/**
 * Finding anything that has a page, from the header of every page.
 *
 * Keyboard first, because the people who use a search box most are the
 * ones who never take their hands off the keys: "/" or Ctrl+K focuses it
 * from anywhere, the arrows move through what was found, Enter opens it,
 * Escape puts it away. The pointer works too.
 *
 * The platform ranks; this only shows. A company, an index, a sector and a
 * fund each carry the icon they carry everywhere else, so a reader knows
 * what kind of page they are about to land on.
 */

import { Search } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { SearchHit } from "@/api/client";
import { fetchSearch } from "@/api/client";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { ENTITIES } from "@/lib/entities";
import { hitPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** How many recent choices are remembered, per browser. */
const REMEMBERED = 6;

const STORAGE_KEY = "artha.search.recent";

/**
 * Render the search box.
 *
 * @returns The box, with its results under it while it is open.
 */
export function SearchBox(): React.JSX.Element {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<SearchHit[]>(() => remembered());
  const query = useDebounced(typed.trim());

  const load = useCallback(
    () => (query.length < 2 ? Promise.resolve<SearchHit[]>([]) : fetchSearch(query)),
    [query],
  );
  const found = useResource(load);

  // What is listed: what was found for the letters typed, or what was
  // chosen recently when nothing has been typed yet.
  const hits = useMemo(
    () => (query.length < 2 ? recent : (found.data ?? [])),
    [query, recent, found.data],
  );

  // Back to the top whenever the list changes under the cursor: an index
  // into the previous list means nothing in the next one.
  useEffect(() => {
    setActive(0);
  }, [hits]);

  // "/" and Ctrl+K reach the box from anywhere on the page -- unless the
  // reader is already typing somewhere, where "/" is a character.
  useEffect(() => {
    const focus = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const typing = target !== null && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (
        (event.key === "/" && !typing) ||
        (event.key === "k" && (event.ctrlKey || event.metaKey))
      ) {
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", focus);
    return () => {
      window.removeEventListener("keydown", focus);
    };
  }, []);

  const choose = (hit: SearchHit): void => {
    const kept = [hit, ...recent.filter((one) => one.key !== hit.key)].slice(0, REMEMBERED);
    setRecent(kept);
    remember(kept);
    setTyped("");
    setOpen(false);
    input.current?.blur();
    void navigate(hitPath(hit));
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
        choose(hit);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  };

  const showing = open && (hits.length > 0 || (query.length >= 2 && !found.loading));

  return (
    <div className="relative w-full max-w-md">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60"
      />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={
          showing && hits[active] !== undefined ? `${listId}-${String(active)}` : undefined
        }
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search companies, indices, sectors, funds  ( / )"
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        // Closed on the next tick rather than at once, so a click on a
        // result lands before the list it is in disappears.
        onBlur={() => {
          setTimeout(() => {
            setOpen(false);
          }, 150);
        }}
        onKeyDown={onKey}
        className="h-9 w-full rounded-md border border-layout-border bg-background/60 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {showing && (
        <ul
          id={listId}
          role="listbox"
          aria-label={query.length < 2 ? "Recent" : "Results"}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {query.length < 2 && hits.length > 0 && (
            <li className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent
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
                    choose(hit);
                  }}
                  onMouseEnter={() => {
                    setActive(position);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm",
                    position === active ? "bg-accent text-accent-foreground" : "",
                  )}
                >
                  <Mark aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{hit.label}</span>
                    {hit.detail !== null && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.detail}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    {ENTITIES[hit.kind].label}
                  </span>
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
 * What was chosen recently, from this browser.
 *
 * @returns The hits, most recent first, or nothing when storage is not
 *   available -- a private window, say -- which is a convenience lost
 *   rather than a fault.
 */
function remembered(): SearchHit[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? [] : (JSON.parse(raw) as SearchHit[]);
  } catch {
    return [];
  }
}

/**
 * Keep what was chosen, for next time.
 *
 * @param hits - The recent choices, most recent first.
 */
function remember(hits: SearchHit[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hits));
  } catch {
    // Storage refused; the box still works, it just forgets.
  }
}
