/**
 * A bar of links to a long page's sections, held under the header as the
 * page scrolls, marking the section being read.
 *
 * The backtest page runs to eleven sections at one heading size, and a
 * reader after the trades scrolled past the rules to find them. The bar is
 * plain anchors, so it works without script, and a link moves the focus
 * with it. Which section is being read is watched with an
 * `IntersectionObserver` where the browser has one; where it has none the
 * links still work and nothing is marked.
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/** One section the bar leads to. */
export interface BarSection {
  /** The section's element id. */
  id: string;
  label: string;
}

/**
 * Render the bar.
 *
 * @param props - The sections, in page order, and what the bar is called.
 * @returns The bar.
 */
export function SectionBar({
  sections,
  label,
}: {
  sections: readonly BarSection[];
  label: string;
}): React.JSX.Element {
  const [reading, setReading] = useState<string | null>(null);
  const ids = sections.map((section) => section.id).join(" ");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    // A section counts as being read once its top has passed the upper
    // third of the screen; the last to do so is the one marked.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setReading(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const id of ids.split(" ")) {
      const element = document.getElementById(id);
      if (element !== null) {
        observer.observe(element);
      }
    }
    return () => {
      observer.disconnect();
    };
  }, [ids]);

  return (
    <nav
      aria-label={label}
      className="sticky top-14 z-20 -mx-4 overflow-x-auto border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:-mx-6 md:px-6"
    >
      <ul className="flex gap-1 py-2 text-sm">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={reading === section.id ? "location" : undefined}
              className={cn(
                "block whitespace-nowrap rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                reading === section.id && "bg-primary/10 font-medium text-primary",
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
