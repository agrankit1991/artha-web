/**
 * A scheme's plan and option, said the same way on the list and on the
 * scheme's own page.
 */

import type { Scheme } from "@/api/client";
import { Hint } from "@/components/Hint";
import { Badge } from "@/components/ui/badge";
import { ABSENT } from "@/lib/format";
import { shortOption } from "@/lib/funds";

/**
 * The plan and the option as badges, with the plan explained.
 *
 * A direct plan is the same fund without the distributor's commission, so
 * the two differ by roughly a percent a year compounded, and a reader
 * comparing the two rows should know that the gap is the fee and not the
 * fund.
 *
 * @param props - The scheme.
 * @returns The plan as a badge with its explanation, then the option;
 *   or a dash when the plan is unpublished.
 */
export function SchemePlan({ scheme }: { scheme: Scheme }): React.JSX.Element {
  if (scheme.plan === null) {
    return <span className="text-muted-foreground">{ABSENT}</span>;
  }
  const direct = scheme.plan.toLowerCase().includes("direct");
  return (
    <span className="flex flex-wrap items-center gap-1">
      <Hint
        term={direct ? "a direct plan" : "a regular plan"}
        text={
          direct
            ? "Bought from the fund house directly, with no distributor's commission. The same fund as the regular plan, roughly a percent a year cheaper, compounded."
            : "Bought through a distributor, whose commission comes out of the fund each year. The direct plan of the same fund is roughly a percent a year cheaper."
        }
      >
        <Badge variant={direct ? "secondary" : "outline"}>{direct ? "Direct" : "Regular"}</Badge>
      </Hint>
      {scheme.option !== null && (
        <span className="text-xs text-muted-foreground">{shortOption(scheme.option)}</span>
      )}
    </span>
  );
}
