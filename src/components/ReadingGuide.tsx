/**
 * "How to read this": the longer explanation of a section, for the reader who wants it.
 *
 * The owner asked for every section and option to say what it is about
 * (2026-10-17), and chose a short line always visible (`SectionHeader`'s
 * description), a mark on every choice and column (`Hint`), and for the
 * busier sections this: the whole reading, one click away, so the page
 * stays short for the reader who already knows it.
 *
 * A native `details` element, so it opens with the keyboard and needs no
 * state of its own.
 */

import { ChevronDown } from "lucide-react";

interface ReadingGuideProps {
  /** One point to a paragraph, in the order they are best read. */
  children: React.ReactNode;
  /** What it opens with; "How to read this" unless said. */
  title?: string;
}

/**
 * Draw the guide, shut until asked.
 *
 * @param props - The points and the title.
 * @returns The guide.
 */
export function ReadingGuide({
  children,
  title = "How to read this",
}: ReadingGuideProps): React.JSX.Element {
  return (
    <details className="group rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-muted-foreground hover:text-foreground">
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 transition-transform group-open:rotate-180"
        />
        {title}
      </summary>
      <div className="mt-2 space-y-2 leading-relaxed">{children}</div>
    </details>
  );
}
