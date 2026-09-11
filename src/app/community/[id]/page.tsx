"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { PrimaryButton } from "@/components/Button";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { PostCard } from "@/components/community/PostCard";
import { relativeTime } from "@/lib/relative-time";
import { useLiveQuery } from "@/db/live";
import { getCommunityPost, listCommunityComments, addCommunityComment, deleteCommunityComment, reportCommunityItem, type CommentRow } from "@/db/queries/community";

export default function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;

  const { data: post } = useLiveQuery(() => getCommunityPost(id), [id]);
  const { data: comments } = useLiveQuery(() => listCommunityComments(id), [id]);

  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function handleComment() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await addCommunityComment(id, body.trim());
      setBody("");
    } finally {
      setPosting(false);
    }
  }

  if (post === undefined) {
    return (
      <Screen>
        <BackHeader title="Post" fallbackHref="/community" />
        <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
      </Screen>
    );
  }

  if (post === null) {
    return (
      <Screen>
        <BackHeader title="Post" fallbackHref="/community" />
        <p style={{ color: "var(--color-ink-muted)" }}>This post was removed.</p>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a comment..."
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-line)",
              background: "var(--color-surface-alt)",
              color: "var(--color-ink)",
              fontSize: "var(--font-body-size)",
            }}
          />
          <PrimaryButton onClick={handleComment} disabled={posting || !body.trim()}>
            {posting ? "..." : "Send"}
          </PrimaryButton>
        </div>
      }
    >
      <BackHeader title="Post" fallbackHref="/community" />

      <PostCard post={post} currentUserId={currentUserId} onDeleted={() => router.replace("/community")} />

      <p style={{ fontWeight: 600, marginBottom: 8 }}>
        {comments ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Comments"}
      </p>

      {comments?.length === 0 && <p style={{ color: "var(--color-ink-muted)" }}>No comments yet — say something.</p>}

      {comments?.map((c) => (
        <CommentItem key={c.id} comment={c} currentUserId={currentUserId} />
      ))}
    </Screen>
  );
}

function CommentItem({ comment, currentUserId }: { comment: CommentRow; currentUserId: string | null }) {
  const [reporting, setReporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const isOwn = currentUserId === comment.userId;
  const author = comment.author.name?.trim() || comment.author.username?.trim() || "A fellow hobbyist";

  if (deleted) return null;

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <AuthorAvatar photoUri={comment.author.photoUri} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>{author}</p>
          <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{relativeTime(comment.createdAt)}</p>
        </div>
        <p style={{ margin: "2px 0 0", fontSize: "var(--font-body-sm-size)", whiteSpace: "pre-wrap" }}>{comment.body}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          {!reporting && !status && (
            <button
              type="button"
              onClick={() => setReporting(true)}
              style={{ background: "none", border: "none", padding: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}
            >
              Report
            </button>
          )}
          {isOwn && (
            <button
              type="button"
              onClick={async () => {
                await deleteCommunityComment(comment.id);
                setDeleted(true);
              }}
              style={{ background: "none", border: "none", padding: 0, color: "var(--color-fix-now)", fontSize: "var(--font-caption-size)" }}
            >
              Delete
            </button>
          )}
        </div>
        {reporting && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={async () => {
                await reportCommunityItem({ targetType: "comment", targetId: comment.id });
                setReporting(false);
                setStatus("Reported.");
              }}
              style={{ background: "none", border: "none", padding: 0, color: "var(--color-fix-now)", fontSize: "var(--font-caption-size)", fontWeight: 600 }}
            >
              Confirm report
            </button>
            <button
              type="button"
              onClick={() => setReporting(false)}
              style={{ background: "none", border: "none", padding: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}
            >
              Cancel
            </button>
          </div>
        )}
        {status && <p style={{ margin: "4px 0 0", color: "var(--color-improve)", fontSize: "var(--font-caption-size)" }}>{status}</p>}
      </div>
    </div>
  );
}
