// General product feedback (2026-09-14) — same fetch-the-server-API
// pattern as src/db/queries/community.ts.

export type FeedbackSource = "home" | "ask" | "settings";

export type FeedbackRow = {
  id: string;
  userId: string;
  source: string;
  body: string;
  createdAt: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function submitFeedback(input: { source: FeedbackSource; body: string }): Promise<void> {
  await json(await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
}

/** Hidden /dev/feedback viewer only. */
export async function listFeedback(): Promise<FeedbackRow[]> {
  return json(await fetch("/api/feedback"));
}
