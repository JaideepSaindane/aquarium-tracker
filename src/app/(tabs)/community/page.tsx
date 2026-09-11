"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Screen } from "@/components/Screen";
import { Banner } from "@/components/Banner";
import { PrimaryButton } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/components/community/PostCard";
import { useLiveQuery } from "@/db/live";
import { listCommunityPosts } from "@/db/queries/community";

/**
 * Community (MVP, 2026-09-11) — a deliberate, confirmed exception to
 * CLAUDE.md's "do not build yet" list (see that file's own note). Scoped
 * to exactly what Jaideep asked for first: a single feed, posts with an
 * optional photo, comments (on the post detail page), report, delete your
 * own. Q&A tab, My Posts, list/block/grid view toggle and a save/bookmark
 * button are explicitly deferred to a follow-up, not built here.
 */
export default function CommunityPage() {
  const { data: session } = useSession();
  const { data: posts } = useLiveQuery(() => listCommunityPosts(), []);
  const currentUserId = session?.user?.id ?? null;

  return (
    <Screen>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ fontSize: "var(--font-title-size)", margin: 0 }}>Community</h1>
        <Link href="/community/new">
          <PrimaryButton>+ New Post</PrimaryButton>
        </Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Banner severity="neutral">
          Community advice isn&apos;t verified — for anything urgent,{" "}
          <Link href="/emergency" style={{ color: "inherit", textDecoration: "underline" }}>
            use Emergency Triage
          </Link>
          .
        </Banner>
      </div>

      {!posts && <p style={{ color: "var(--color-ink-muted)" }}>Loading...</p>}

      {posts && posts.length === 0 && (
        <EmptyState icon="💬" message="No posts yet — be the first to share your tank or ask a question." />
      )}

      {posts?.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} linkToDetail />
      ))}
    </Screen>
  );
}
