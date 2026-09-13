const INTRO_PLAYED_KEY = "aqua_intro_played_this_session";

/**
 * Tracks whether the fish-leap intro has already played once in this
 * browser tab session (`sessionStorage`, so a fresh tab/reload of the app
 * later gets the intro again — this is purely about not showing it twice
 * back-to-back within the same visit). Added 2026-09-13: Jaideep hit the
 * intro playing on `/login`, then playing *again* seconds later on
 * `/onboarding` right after a fresh Google/phone sign-up — the exact same
 * animation, twice, with a flash of "My Tanks" in between (see
 * OnboardingGate.tsx's own fix for that flash). `sessionStorage` can throw
 * in some private-browsing contexts, so every call is wrapped and best-effort
 * only — worst case here is the intro plays once more than ideal, never a
 * crash.
 */
export function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(INTRO_PLAYED_KEY, "1");
  } catch {
    // best-effort only
  }
}

export function hasIntroPlayedThisSession(): boolean {
  try {
    return sessionStorage.getItem(INTRO_PLAYED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Used by Settings' "Start over" — a deliberate replay should always show the intro, even if it already played once earlier in this tab session. */
export function clearIntroPlayed(): void {
  try {
    sessionStorage.removeItem(INTRO_PLAYED_KEY);
  } catch {
    // best-effort only
  }
}
