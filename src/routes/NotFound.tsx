/**
 * An address nothing lives at.
 *
 * Said plainly, with the way back: a mistyped path or an old bookmark
 * otherwise opens an empty page inside the frame, which looks like a page
 * that failed to load rather than one that does not exist.
 */

import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";

/**
 * Render the page.
 *
 * @returns The page.
 */
export function NotFound(): React.JSX.Element {
  const { pathname } = useLocation();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <img src="/brand/logo.svg" alt="" className="h-16 w-16 opacity-80" />
      <h1 className="text-page font-bold tracking-tight">Nothing lives here</h1>
      <p className="text-sm text-muted-foreground">
        There is no page at <span className="font-mono text-foreground">{pathname}</span>. Search
        for what you were after with <kbd className="rounded border bg-muted px-1 font-mono">/</kbd>
        , or start from the overview.
      </p>
      <Button asChild>
        <Link to="/" viewTransition>
          Go to the overview
        </Link>
      </Button>
    </div>
  );
}
