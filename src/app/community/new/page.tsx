"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Banner } from "@/components/Banner";
import { PrimaryButton } from "@/components/Button";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { createCommunityPost } from "@/db/queries/community";
import { uploadPhoto } from "@/lib/photo-upload";

export default function NewCommunityPostPage() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    if (!body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      let photoUri: string | undefined;
      if (photoFile) photoUri = await uploadPhoto(photoFile);
      await createCommunityPost({ body: body.trim(), photoUri });
      router.replace("/community");
    } catch {
      setError("Couldn't post — check your connection and try again.");
      setPosting(false);
    }
  }

  return (
    <Screen
      footer={
        <PrimaryButton onClick={handlePost} disabled={posting || !body.trim()}>
          {posting ? "Posting..." : "Post"}
        </PrimaryButton>
      }
    >
      <BackHeader title="New Post" fallbackHref="/community" />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Just set this tank up — what fish is this? Ask a question or share your tank..."
        rows={6}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-line)",
          background: "var(--color-surface-alt)",
          color: "var(--color-ink)",
          fontSize: "var(--font-body-size)",
          fontFamily: "inherit",
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />

      <div style={{ height: 12 }} />
      <PhotoPickerButton label={photoFile ? "Photo attached ✓" : "Add a photo (optional)"} onPick={setPhotoFile} />

      {error && (
        <div style={{ marginTop: 12 }}>
          <Banner severity="watch">{error}</Banner>
        </div>
      )}
    </Screen>
  );
}
