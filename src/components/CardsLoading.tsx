/**
 * Where a grid of cards will be, while it is on its way.
 *
 * A card grid that is empty while it loads reads as a list with nothing in
 * it, and one that pops in shoves the page down. So every card list holds
 * room with shimmering cards of about the right shape: a name, a line
 * under it, a figure and a row of readings.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Render the placeholders, as cells of the caller's grid.
 *
 * @param props - How many to hold room for; six fills two rows of three.
 * @returns The placeholder cards.
 */
export function CardsLoading({ count = 6 }: { count?: number }): React.JSX.Element {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
