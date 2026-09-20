/**
 * Fetching one thing, with the three states that implies.
 *
 * Small on purpose. A query library would bring caching, retries and
 * deduplication, none of which this application needs yet: its screens
 * fetch once when they open and again when the scope changes. When a screen
 * arrives that genuinely wants shared caching, bring one in then -- for now
 * this is forty lines that can be read in full.
 */

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/api/client";

/** What a fetch is doing, and what came of it. */
export interface Resource<T> {
  data: T | null;
  loading: boolean;
  /** The platform's own explanation, when it failed. */
  error: string | null;
  /** True when the failure means "sign in" rather than "something broke". */
  unauthorised: boolean;
  reload: () => void;
}

/**
 * Fetch something, and re-fetch it when the inputs change.
 *
 * @param fetcher - How to fetch it. Re-run whenever this identity changes,
 *   so callers wrap it in `useCallback` with the inputs it depends on.
 * @returns The resource and its state.
 */
export function useResource<T>(fetcher: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorised, setUnauthorised] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setAttempt((previous) => previous + 1);
  }, []);

  useEffect(() => {
    // Guards against a reply from a request the screen has moved on from:
    // two scope changes in quick succession must not leave the first one's
    // answer on screen.
    let current = true;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (current) {
          setData(result);
          setUnauthorised(false);
        }
      })
      .catch((failure: unknown) => {
        if (!current) {
          return;
        }
        setUnauthorised(failure instanceof ApiError && failure.isUnauthorised);
        setError(failure instanceof Error ? failure.message : "something went wrong");
      })
      .finally(() => {
        if (current) {
          setLoading(false);
        }
      });

    return () => {
      current = false;
    };
  }, [fetcher, attempt]);

  return { data, loading, error, unauthorised, reload };
}
