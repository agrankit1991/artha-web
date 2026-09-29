/**
 * A growth figure as a table cell, with the sample it was taken over.
 *
 * The earnings page's two tables each wrote their own, with different
 * words for the same missing figure and the share growing hand-coloured.
 * One cell now: the change as a `Delta`, "n/a" where the earlier total was
 * a loss, a dash where nothing compares, and every figure's sample under
 * it, because growth over three companies is not the claim growth over
 * three hundred is.
 */

import type { GrowthFigure } from "@/api/client";
import { Delta } from "@/components/Delta";
import { Hint } from "@/components/Hint";
import { ABSENT, toNumber } from "@/lib/format";

/**
 * Render one growth figure.
 *
 * @param props - The figure, or null where no comparison is held.
 * @returns The cell's content.
 */
export function GrowthCell({ figure }: { figure: GrowthFigure | null }): React.JSX.Element {
  if (figure === null) {
    return (
      <Hint
        term="a missing growth figure"
        text="No comparison period is held for these companies, or fewer than three of them reported in both."
      >
        <span className="text-muted-foreground">{ABSENT}</span>
      </Hint>
    );
  }
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      {figure.percent === null ? (
        <Hint
          term="n/a"
          text="The earlier total was nought or a loss, and growth from a loss is not a percentage anybody means. The totals still stand."
        >
          <span className="text-muted-foreground">n/a</span>
        </Hint>
      ) : (
        <Delta value={figure.percent} />
      )}
      <span className="text-micro text-muted-foreground">n = {figure.sample}</span>
    </span>
  );
}

/**
 * The share of the sample whose figure grew: a level, so plain, as the
 * breadth meters are. Painting it green above half and red below said
 * something rose or fell.
 *
 * @param props - The figure the share belongs to.
 * @returns The share, or a dash.
 */
export function GrowingShare({ figure }: { figure: GrowthFigure | null }): React.JSX.Element {
  // Whole per cent: a share of a sample of companies has no second decimal
  // worth reading.
  const share = toNumber(figure?.growing ?? null);
  return <span className="tabular">{share === null ? ABSENT : `${share.toFixed(0)}%`}</span>;
}
