/**
 * Something went wrong, said plainly.
 *
 * The platform's own words for what failed, in a box that cannot be
 * mistaken for an empty result. An empty list and a failed request look
 * alike if both are rendered as nothing.
 */

import { Callout } from "@/components/Callout";
import { sentence } from "@/lib/format";

interface FailedProps {
  /** What the platform said. */
  message: string;
  className?: string;
}

/**
 * Render the failure.
 *
 * @param props - What failed.
 * @returns The state.
 */
export function Failed({ message, className }: FailedProps): React.JSX.Element {
  // The danger note, so a failure looks the same as every other red note.
  return (
    <Callout tone="danger" {...(className === undefined ? {} : { className })}>
      {sentence(message)}
    </Callout>
  );
}
