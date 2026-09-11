"use client";

import { useEffect, useState } from "react";
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cropping already happens inside PhotoPickerButton, so photoFile here is
  // the final image — just preview it directly instead of re-showing a
  // generic "Photo attached" label (Jaideep's ask: show the actual photo,
  // compact, above the text field).
  useEffect(() => {
    if (!photoFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhotoPreview(null);
      return;
    }
    // Genuine external-resource sync (see TankAvatar.tsx's identical
    // pattern/comment) — createObjectURL allocates a real browser resource
    // that needs a matching revoke on cleanup.
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

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

      {photoPreview ? (
        <div style={{ position: "relative", marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview}
            alt=""
            style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "var(--radius-md)", display: "block" }}
          />
          <button
            type="button"
            onClick={() => setPhotoFile(null)}
            aria-label="Remove photo"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <PhotoPickerButton label="Add a photo (optional)" onPick={setPhotoFile} />
        </div>
      )}

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

      {photoPreview && (
        <>
          <div style={{ height: 8 }} />
          <PhotoPickerButton label="Change photo" onPick={setPhotoFile} />
        </>
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
          <Banner severity="watch">{error}</Banner>
        </div>
      )}
    </Screen>
  );
}
