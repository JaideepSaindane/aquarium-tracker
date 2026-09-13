"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/Button";
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
 * Redesign Section 8 ("a living feed that scans quickly", 2026-09-13) tried
 * a floating action button for "+ New Post" here; Jaideep reverted it the
 * same day ("I dont like... '+ New Post' is now a floating action button")
 * back to the plain header button below. PostCard itself still decides its
 * own compact-vs-card layout per post (see that component) so more posts
 * fit on screen at once — that part of Section 8 stands.
 */
export default function CommunityPage() {
  const { data: session } = useSession();
  const { data: posts } = useLiveQuery(() => listCommunityPosts(), []);
  const currentUserId = session?.user?.id ?? null;
  const t = useTranslation();

  return (
    <Screen>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ fontSize: "var(--font-title-size)", margin: 0 }}>{t.communityPage.title}</h1>
        <Link href="/community/new">
          <PrimaryButton>{t.communityPage.newPost}</PrimaryButton>
        </Link>
      </div>

      {!posts && <p style={{ color: "var(--color-ink-muted)" }}>{t.common.loading}</p>}

      {posts && posts.length === 0 && (
        <EmptyState icon="💬" message={t.communityPage.empty} />
      )}

      {posts?.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} linkToDetail />
      ))}
    </Screen>
  );
}
