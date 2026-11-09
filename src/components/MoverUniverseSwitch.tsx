/**
 * Whether the mover lists rank every company or only the liquid ones.
 *
 * The market's biggest riser is usually a company a retail buyer cannot
 * safely trade, so the lists rank only companies worth at least ₹1,000
 * crore and trading at least ₹10 crore a session unless the reader asks
 * for all. One choice, kept in preferences, so the overview and the movers
 * page agree.
 */

import type { MoverUniverse } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { Hint } from "@/components/Hint";

const OPTIONS: readonly { key: MoverUniverse; label: string }[] = [
  { key: "liquid", label: "Liquid only" },
  { key: "all", label: "All companies" },
];

/**
 * Render the switch.
 *
 * @param props - The choice, and what changing it does.
 * @returns The switch, with what "liquid" means a hover away.
 */
export function MoverUniverseSwitch({
  universe,
  onChange,
}: {
  universe: MoverUniverse;
  onChange: (next: MoverUniverse) => void;
}): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Chooser options={OPTIONS} chosen={universe} onChange={onChange} label="Companies ranked" />
      <Hint
        term="liquid"
        text="Worth at least ₹500 crore, with at least ₹2 crore traded a session on average over the last twenty: busy enough to buy and sell an ordinary order without moving the price. The scans keep the stricter ₹1,000 crore and ₹10 crore their strategies were tested with."
      />
    </span>
  );
}
