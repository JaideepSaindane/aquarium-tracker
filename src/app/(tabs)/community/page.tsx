"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Screen } from "@/components/Screen";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/community/PostCard";
import { useLiveQuery } from "@/db/live";
import { listCommunityPosts } from "@/db/queries/community";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Community (MVP, 2026-09-11) — a deliberate, confirmed exception to
 * CLAUDE.md's "do not build yet" list (see that file's own note). Scoped
 * to exactly what Jaideep asked for first: a single feed, posts with an
 * optional photo, comments (on the post detail page), report, delete your
 * own. Q&A tab, My Posts, list/block/grid view toggle and a save/bookmark
 * button are explicitly deferred to a follow-up, not built here.
 *
 * Redesign Section 8 ("a living feed that scans quickly", 2026-09-13):
 * "+ New Post" moved from a header button into a floating action button —
 * the brief's one deliberately-endorsed use of a FAB, since composing a
 * post is the single primary action on this screen and a FAB keeps it
 * reachable while scrolling a long feed, which a header button doesn't.
 * PostCard itself now decides its own compact-vs-card layout per post
 * (see that component) so more posts fit on screen at once.
 */
export default function CommunityPage() {
  const { data: session } = useSession();
  const { data: posts } = useLiveQuery(() => listCommunityPosts(), []);
  const currentUserId = session?.user?.id ?? null;
  const t = useTranslation();

  return (
    <Screen>
      <h1 style={{ fontSize: "var(--font-title-size)", margin: "0 0 12px" }}>{t.communityPage.title}</h1>

      {!posts && <p style={{ color: "var(--color-ink-muted)" }}>{t.common.loading}</p>}

      {posts && posts.length === 0 && (
        <EmptyState icon="💬" message={t.communityPage.empty} />
      )}

      {posts?.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} linkToDetail />
      ))}

      <Link
        href="/community/new"
        aria-label={t.communityPage.newPost}
        style={{
          position: "fixed",
          right: 20,
          bottom: "calc(var(--dock-clearance) + 16px)",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--color-deep)",
          color: "var(--color-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: 700,
          boxShadow: "var(--shadow-lift, 0 8px 24px rgba(0,0,0,0.25))",
          zIndex: 20,
        }}
      >
        +
      </Link>
    </Screen>
  );
}
