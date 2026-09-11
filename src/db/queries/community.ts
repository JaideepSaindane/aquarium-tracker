import { notifyChanged } from "../live";

// Community (2026-09-11 MVP) — same fetch-the-server-API pattern as every
// other query file in this directory (see tanks.ts's header comment for
// the original shape this follows), just for a feature that never had a
// local SQLite phase at all.

export type Author = { name: string | null; username: string | null; photoUri: string | null };

export type PostRow = {
  id: string;
  userId: string;
  body: string;
  photoUris: string[];
  createdAt: string;
  deletedAt: string | null;
  author: Author;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
};

export type CommentRow = {
  id: string;
  userId: string;
  postId: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  author: Author;
};

export type ReportRow = {
  id: string;
  reporterUserId: string;
  targetType: "post" | "comment";
  targetId: string;
  reason: string | null;
  createdAt: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function listCommunityPosts(): Promise<PostRow[]> {
  return json(await fetch("/api/community/posts"));
}

export async function getCommunityPost(id: string): Promise<PostRow | null> {
  const res = await fetch(`/api/community/posts/${id}`);
  if (res.status === 404) return null;
  return json(res);
}

export async function createCommunityPost(input: { body: string; photoUris?: string[] }): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch("/api/community/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
  );
  notifyChanged();
  return id;
}

/** Toggles the current user's like on a post — returns the new state so the caller doesn't need a second fetch. */
export async function toggleCommunityLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const result = await json<{ liked: boolean; likeCount: number }>(await fetch(`/api/community/posts/${postId}/like`, { method: "POST" }));
  notifyChanged();
  return result;
}

/** Refuses silently (server 404s) if you're not the author — the button that calls this should only ever show for your own posts. */
export async function deleteCommunityPost(id: string): Promise<void> {
  await fetch(`/api/community/posts/${id}`, { method: "DELETE" });
  notifyChanged();
}

export async function listCommunityComments(postId: string): Promise<CommentRow[]> {
  return json(await fetch(`/api/community/posts/${postId}/comments`));
}

export async function addCommunityComment(postId: string, body: string): Promise<string> {
  const { id } = await json<{ id: string }>(
    await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    })
  );
  notifyChanged();
  return id;
}

export async function deleteCommunityComment(id: string): Promise<void> {
  await fetch(`/api/community/comments/${id}`, { method: "DELETE" });
  notifyChanged();
}

export async function reportCommunityItem(input: { targetType: "post" | "comment"; targetId: string; reason?: string }): Promise<void> {
  await fetch("/api/community/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
}

/** Hidden /dev/community-reports viewer only. */
export async function listCommunityReports(): Promise<ReportRow[]> {
  return json(await fetch("/api/community/reports"));
}
