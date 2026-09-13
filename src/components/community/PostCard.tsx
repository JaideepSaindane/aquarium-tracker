"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { PostPhotoStrip } from "@/components/community/PostPhotoStrip";
import { relativeTime } from "@/lib/relative-time";
import { looksNonEnglish } from "@/lib/looks-non-english";
import { translateText } from "@/lib/ai-client";
import { useLocale } from "@/i18n/use-locale";
import { deleteCommunityPost, reportCommunityItem, toggleCommunityLike, type PostRow } from "@/db/queries/community";

function authorLabel(author: PostRow["author"]): string {
  return author.name?.trim() || author.username?.trim() || "A fellow hobbyist";
}

/**
 * One post — used both in the feed (linked, with a comment-count line) and
 * at the top of the post detail page (not linked, no comment-count line,
 * since the comments are right there already).
 */
export function PostCard({ post, currentUserId, linkToDetail, onDeleted }: { post: PostRow; currentUserId: string | null; linkToDetail?: boolean; onDeleted?: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likeBusy, setLikeBusy] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const isOwn = currentUserId === post.userId;
  const { locale } = useLocale();
  const showTranslate = looksNonEnglish(post.body);
  const hasPhoto = post.photoUris.length > 0;

  async function handleTranslate() {
    if (translated) {
      // Already translated once — toggle back to the original instead of re-calling the API.
      setTranslated(null);
      return;
    }
    setTranslating(true);
    setTranslateError(null);
    const result = await translateText(post.body, locale);
    setTranslating(false);
    if (result.ok) {
      setTranslated(result.data.translated);
      setDetectedLanguage(result.data.detectedLanguage);
    } else {
      setTranslateError("Couldn't translate — try again.");
    }
  }

  async function handleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    // Optimistic — the server call confirms/corrects a moment later.
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const result = await toggleCommunityLike(post.id);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setLiked(!nextLiked);
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleReport() {
    await reportCommunityItem({ targetType: "post", targetId: post.id, reason: reportNote.trim() || undefined });
    setReporting(false);
    setReportNote("");
    setStatus("Reported — thanks for flagging it.");
  }

  async function handleDelete() {
    await deleteCommunityPost(post.id);
    onDeleted?.();
  }

  // Redesign Section 8 ("a living feed that scans quickly"): a Card around
  // every post — background, border, shadow, full padding — read as heavy
  // for a plain text post with nothing to contain. A photo post keeps the
  // Card (a real surface for the image to sit on); a text-only post is
  // just content with a hairline divider underneath, like a normal list
  // row, so more of them fit on screen at once.
  const Wrapper = hasPhoto ? Card : "div";
  const wrapperStyle = hasPhoto
    ? { padding: "var(--space-md)", marginBottom: "var(--space-md)" }
    : { padding: "var(--space-md) 0", borderBottom: "1px solid var(--color-line-soft)" };

  return (
    <Wrapper style={wrapperStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <AuthorAvatar photoUri={post.author.photoUri} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>{authorLabel(post.author)}</p>
          <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{relativeTime(post.createdAt)}</p>
        </div>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            aria-label="More actions"
            onClick={() => setShowMenu((v) => !v)}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "none", color: "var(--color-ink-muted)", fontSize: 18 }}
          >
            ⋮
          </button>
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} aria-hidden />
              <div
                style={{
                  position: "absolute",
                  top: 32,
                  right: 0,
                  zIndex: 30,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-md)",
                  overflow: "hidden",
                  minWidth: 140,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setReporting(true);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", fontSize: "var(--font-body-sm-size)", color: "var(--color-ink)" }}
                >
                  Report
                </button>
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      void handleDelete();
                    }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderTop: "1px solid var(--color-line-soft)", fontSize: "var(--font-body-sm-size)", color: "var(--color-fix-now)" }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "var(--font-body-size)" }}>{translated ?? post.body}</p>

      {showTranslate && (
        <button
          type="button"
          onClick={handleTranslate}
          disabled={translating}
          style={{ background: "none", border: "none", padding: 0, marginTop: 4, color: "var(--color-deep)", fontWeight: 600, fontSize: "var(--font-caption-size)" }}
        >
          {translating ? "Translating..." : translated ? `Translated from ${detectedLanguage ?? "another language"} · Show original` : "Translate"}
        </button>
      )}
      {translateError && <p style={{ margin: "4px 0 0", color: "var(--color-fix-now)", fontSize: "var(--font-caption-size)" }}>{translateError}</p>}

      <PostPhotoStrip photoUris={post.photoUris} />

      {/* Redesign Section 8: "like/comment affordances more visible" — bigger
          icons, real text weight, and a real ≥44px tap target instead of
          small muted-gray text sized to the icon next to it. */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8 }}>
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minHeight: 44,
            background: "none",
            border: "none",
            padding: "0 4px 0 0",
            color: liked ? "var(--color-fix-now)" : "var(--color-ink)",
            fontSize: "var(--font-body-sm-size)",
            fontWeight: 700,
          }}
        >
          <span aria-hidden style={{ fontSize: 20 }}>
            {liked ? "❤️" : "🤍"}
          </span>
          {likeCount > 0 ? likeCount : "Like"}
        </button>

        {linkToDetail && (
          <Link
            href={`/community/${post.id}`}
            style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 44, color: "var(--color-ink)", fontSize: "var(--font-body-sm-size)", fontWeight: 700 }}
          >
            <span aria-hidden style={{ fontSize: 20 }}>
              💬
            </span>
            {post.commentCount > 0 ? post.commentCount : "Comment"}
          </Link>
        )}
      </div>

      {reporting && (
        <div style={{ marginTop: 8, padding: 10, borderRadius: "var(--radius-md)", background: "var(--color-surface-alt)" }}>
          <p style={{ margin: "0 0 6px", fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>Report this post?</p>
          <input
            value={reportNote}
            onChange={(e) => setReportNote(e.target.value)}
            placeholder="Optional — what's wrong with it?"
            style={{ width: "100%", padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)", fontSize: "var(--font-body-sm-size)", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={handleReport}
              style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--color-fix-now)", color: "#fff", fontSize: "var(--font-caption-size)", fontWeight: 600 }}
            >
              Report
            </button>
            <button
              type="button"
              onClick={() => setReporting(false)}
              style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-line)", background: "none", color: "var(--color-ink)", fontSize: "var(--font-caption-size)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status && <p style={{ margin: "8px 0 0", color: "var(--color-improve)", fontSize: "var(--font-caption-size)" }}>{status}</p>}
    </Wrapper>
  );
}
