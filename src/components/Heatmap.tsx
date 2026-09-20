/**
 * A population's companies, coloured by how they moved.
 *
 * Drawn from this platform's own figures rather than embedded from
 * somewhere else, so it agrees with the table beside it and works for any
 * population -- including the hundred and fifty-eight sectors no outside
 * widget has ever heard of.
 *
 * Every tile is the same size, deliberately. A real heatmap sizes by market
 * capitalisation, which is price times a share count this platform derives
 * rather than stores; equal tiles are an honest "every company counts
 * once", and match the breadth counts rather than contradicting them.
 */

import type { Member } from "@/api/client";
import { formatPercent, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HeatmapProps {
  members: Member[];
  /** What to do when a company is chosen, if anything. */
  onSelect?: (member: Member) => void;
  /** How many companies to draw before stopping. */
  limit?: number;
  className?: string;
}

/** The move at which a tile reaches full colour. */
const FULL = 4;

const DEFAULT_LIMIT = 120;

/**
 * Draw the population.
 *
 * @param props - The companies, and what choosing one means.
 * @returns The heatmap.
 */
export function Heatmap({
  members,
  onSelect,
  limit = DEFAULT_LIMIT,
  className,
}: HeatmapProps): React.JSX.Element {
  const moved = members.filter((member) => toNumber(member.change_percent) !== null);
  if (moved.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing counted for this population</p>;
  }

  // Biggest movers first and then cut, rather than cut alphabetically: a
  // hundred and twenty tiles of a two-hundred company sector should be the
  // hundred and twenty worth looking at.
  const shown = [...moved]
    .sort(
      (one, other) =>
        Math.abs(toNumber(other.change_percent) ?? 0) - Math.abs(toNumber(one.change_percent) ?? 0),
    )
    .slice(0, limit);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(5.5rem,1fr))]"
        role="list"
        aria-label="Companies by move"
      >
        {shown.map((member) => (
          <Tile key={member.instrument_key} member={member} {...(onSelect ? { onSelect } : {})} />
        ))}
      </div>
      {shown.length < moved.length && (
        <p className="text-xs text-muted-foreground">
          The {shown.length} that moved most, of {moved.length}.
        </p>
      )}
    </div>
  );
}

/** One company. */
function Tile({
  member,
  onSelect,
}: {
  member: Member;
  onSelect?: (member: Member) => void;
}): React.JSX.Element {
  const move = toNumber(member.change_percent) ?? 0;
  // Opacity carries the size of the move and the hue carries its
  // direction, so a strong fall and a weak one are told apart without
  // needing a legend.
  const strength = Math.min(Math.abs(move) / FULL, 1);
  const background =
    move === 0
      ? "var(--muted)"
      : move > 0
        ? `color-mix(in oklab, var(--gain) ${String(18 + strength * 62)}%, transparent)`
        : `color-mix(in oklab, var(--loss) ${String(18 + strength * 62)}%, transparent)`;

  const content = (
    <>
      <span className="block truncate text-xs font-medium">{member.symbol}</span>
      <span className="block truncate text-xs tabular opacity-80">
        {formatPercent(member.change_percent)}
      </span>
    </>
  );

  if (onSelect === undefined) {
    return (
      <div
        role="listitem"
        title={`${member.name} ${formatPercent(member.change_percent)}`}
        className="rounded px-2 py-1.5"
        style={{ backgroundColor: background }}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="listitem"
      title={`${member.name} ${formatPercent(member.change_percent)}`}
      onClick={() => {
        onSelect(member);
      }}
      className="rounded px-2 py-1.5 text-left transition-transform hover:scale-[1.04]"
      style={{ backgroundColor: background }}
    >
      {content}
    </button>
  );
}
