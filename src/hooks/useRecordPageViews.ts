/**
 * Telling the platform which page was opened.
 *
 * Once per address, whether or not anyone is signed in, so the owner's
 * visitors page counts the sign-in page's visitors as well as everyone
 * else's pages. The query is left off: which page, not which search on it.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { recordPageView } from "@/api/client";
import { visitorId } from "@/lib/visitor";

/**
 * Record each page as the reader arrives on it.
 *
 * A failure is ignored: counting a visit must never be the reason a page
 * does not work.
 */
export function useRecordPageViews(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    recordPageView(pathname, visitorId()).catch(() => undefined);
  }, [pathname]);
}
