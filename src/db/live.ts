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
 *
 * A real bug this fixes (2026-09-13, Jaideep: "I signed in... the page is
 * stuck and I dont see anything"): `queryFn` rejecting (e.g. a server API
 * call returning a transient 401 right after sign-in, before the session
 * cookie is fully live) used to leave `loading` stuck at `true` forever —
 * nothing ever caught the rejection, so the screen just froze with no
 * error and no way out short of a manual reload. One automatic retry
 * absorbs that kind of transient failure silently; a second failure is
 * treated as real and surfaced via `error` instead of hanging forever.
 */
export function useLiveQuery<T>(queryFn: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; loading: boolean; error: unknown } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const queryFnRef = useRef(queryFn);

  useEffect(() => {
    queryFnRef.current = queryFn;
  });

  useEffect(() => {
    let cancelled = false;
    let retried = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await queryFnRef.current();
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        if (!retried) {
          retried = true;
          setTimeout(run, 800);
          return;
        }
        setError(err);
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

  return { data, loading, error };
}
