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

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { SearchHit } from "@/api/client";
import { InstrumentPicker } from "@/components/InstrumentPicker";
import { hitPath } from "@/lib/paths";

/** How many recent choices are remembered, per browser. */
const REMEMBERED = 6;

const STORAGE_KEY = "artha.search.recent";

/**
 * Render the search box.
 *
 * The finding is `InstrumentPicker`'s; what is this box's own is the way
 * to it from anywhere, what it remembers, and that choosing opens a page.
 *
 * @returns The box, with its results under it while it is open.
 */
export function SearchBox(): React.JSX.Element {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<SearchHit[]>(() => remembered());

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
      }
    };
    window.addEventListener("keydown", focus);
    return () => {
      window.removeEventListener("keydown", focus);
    };
  }, []);

  const open = (hit: SearchHit): void => {
    const kept = [hit, ...recent.filter((one) => one.key !== hit.key)].slice(0, REMEMBERED);
    setRecent(kept);
    remember(kept);
    input.current?.blur();
    void navigate(hitPath(hit), { viewTransition: true });
  };

  return (
    <InstrumentPicker
      inputRef={input}
      label="Search"
      placeholder="Search companies, indices, sectors and funds ( / )"
      onPick={open}
      suggestions={{ heading: "Recent", hits: recent }}
      className="w-full max-w-md"
      inputClassName="border-chrome-border bg-background/60"
    />
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
    // Filled out to the current shape: a hit remembered before the badges
    // and prices existed carries none of them.
    return raw === null
      ? []
      : (JSON.parse(raw) as Partial<SearchHit>[]).map((one) => ({
          kind: one.kind ?? "company",
          key: one.key ?? "",
          label: one.label ?? "",
          detail: one.detail ?? null,
          exchanges: one.exchanges ?? [],
          category: one.category ?? null,
          close: one.close ?? null,
          change_percent: one.change_percent ?? null,
        }));
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
