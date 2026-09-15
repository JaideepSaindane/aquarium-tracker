// Carries a Fish Doctor session into Ask AquaAI as hidden context, so the
// user can keep asking follow-ups without re-explaining. Text only, kept in
// sessionStorage so it survives navigation/reload; cleared when dismissed.
export const ASK_HANDOFF_KEY = "aquaai-ask-handoff";

export type AskHandoff = { title: string; context: string; tankId: string | null };

export function setAskHandoff(handoff: AskHandoff): void {
  try {
    sessionStorage.setItem(ASK_HANDOFF_KEY, JSON.stringify(handoff));
  } catch {}
}

export function readAskHandoff(): AskHandoff | null {
  try {
    const raw = sessionStorage.getItem(ASK_HANDOFF_KEY);
    return raw ? (JSON.parse(raw) as AskHandoff) : null;
  } catch {
    return null;
  }
}

export function clearAskHandoff(): void {
  try {
    sessionStorage.removeItem(ASK_HANDOFF_KEY);
  } catch {}
}
