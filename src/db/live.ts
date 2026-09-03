"use client";

// Hand-built reactive layer — there's no native live-query hook here the way
// expo-sqlite's did. Every write goes through `notifyChanged()` (call it
// after any insert/update/delete in a queries/*.ts function); `useLiveQuery`
// re-runs its query function whenever that fires. Kept in one place per
// T-011 so this pattern isn't re-invented per screen.
import { useEffect, useRef, useState } from "react";

const listeners = new Set<() => void>();

export function notifyChanged() {
  for (const listener of listeners) listener();
}

/**
 * Re-runs `queryFn` on mount, and again after any write anywhere in the app
 * (via notifyChanged). Do not wrap this in TanStack Query — see CLAUDE.md.
 */
export function useLiveQuery<T>(queryFn: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; loading: boolean } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const queryFnRef = useRef(queryFn);

  useEffect(() => {
    queryFnRef.current = queryFn;
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const result = await queryFnRef.current();
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }

    run();
    listeners.add(run);
    return () => {
      cancelled = true;
      listeners.delete(run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}
