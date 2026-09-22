/**
 * A page reached by a readable address.
 *
 * Addresses carry what a reader types and shares -- `/company/RELIANCE`,
 * `/index/nifty-50` -- while every request about the thing is asked by its
 * instrument key or sector name. This asks the platform, once, what the
 * address names and then draws the page for that key. An address saved
 * before readable ones existed still carries the key, and the platform
 * resolves that too, so no bookmark breaks.
 */

import { useCallback } from "react";
import { useParams } from "react-router-dom";

import { type ReferenceKind, fetchReference } from "@/api/client";
import { Failed } from "@/components/Failed";
import { useResource } from "@/hooks/useResource";

interface ReferencedPageProps {
  kind: ReferenceKind;
  /** Draws the page once the address is known to name something. */
  children: (key: string) => React.ReactNode;
}

/**
 * Resolve the address's `:ref` segment and draw its page.
 *
 * @param props - The kind of page and how to draw it.
 * @returns The page, or what went wrong finding it.
 */
export function ReferencedPage({ kind, children }: ReferencedPageProps): React.JSX.Element {
  const { ref = "" } = useParams();
  const resolve = useCallback(() => fetchReference(kind, ref), [kind, ref]);
  const { data, loading, error } = useResource(resolve);

  if (error !== null) {
    return <Failed message={error} />;
  }
  // Waiting on `loading` as well as on an answer: moving from one company
  // to another keeps the previous answer until the new one arrives, and
  // drawing the old page under the new address would start its requests
  // for the wrong company.
  if (loading || data === null) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading…
      </p>
    );
  }
  return <>{children(data.key)}</>;
}
