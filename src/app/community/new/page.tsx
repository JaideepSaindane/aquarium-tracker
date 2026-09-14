"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Banner } from "@/components/Banner";
import { PrimaryButton } from "@/components/Button";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { createCommunityPost } from "@/db/queries/community";
import { uploadPhoto, uploadVideo } from "@/lib/photo-upload";
import { useTranslation } from "@/i18n/use-translation";

const MAX_PHOTOS = 10;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

type PendingPhoto = { file: File; preview: string; isVideo: boolean };

export default function NewCommunityPostPage() {
  const router = useRouter();
  const t = useTranslation();
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAddPhoto(file: File) {
    const isVideo = file.type.startsWith("video/");
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setError(t.newCommunityPostPage.videoTooLarge);
      return;
    }
    setError(null);
    setPhotos((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, { file, preview: URL.createObjectURL(file), isVideo }]));
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handlePost() {
    if (!body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const photoUris = await Promise.all(photos.map((p) => (p.isVideo ? uploadVideo(p.file) : uploadPhoto(p.file))));
      await createCommunityPost({ body: body.trim(), photoUris });
      router.replace("/community");
    } catch {
      setError(t.newCommunityPostPage.couldNotPost);
      setPosting(false);
    }
  }

  return (
    <Screen
      footer={
        <PrimaryButton onClick={handlePost} disabled={posting || !body.trim()}>
          {posting ? t.newCommunityPostPage.posting : t.newCommunityPostPage.post}
        </PrimaryButton>
      }
    >
      <BackHeader title={t.newCommunityPostPage.title} fallbackHref="/community" />

      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, WebkitOverflowScrolling: "touch" }}>
          {photos.map((p, i) => (
            <div key={p.preview} style={{ position: "relative", flexShrink: 0 }}>
              {p.isVideo ? (
                <video src={p.preview} muted style={{ width: 100, height: 100, objectFit: "cover", borderRadius: "var(--radius-md)", display: "block" }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.preview} alt="" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: "var(--radius-md)", display: "block" }} />
              )}
              {p.isVideo && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    pointerEvents: "none",
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                  }}
                >
                  ▶️
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemovePhoto(i)}
                aria-label={p.isVideo ? t.newCommunityPostPage.removeVideo : t.newCommunityPostPage.removePhoto}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t.newCommunityPostPage.bodyPlaceholder}
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
      {photos.length < MAX_PHOTOS && (
        <PhotoPickerButton
          label={
            photos.length === 0
              ? t.newCommunityPostPage.addPhoto
              : t.newCommunityPostPage.addAnotherPhoto.replace("{n}", String(photos.length)).replace("{max}", String(MAX_PHOTOS))
          }
          onPick={handleAddPhoto}
          acceptVideo
        />
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
          <Banner severity="watch">{error}</Banner>
        </div>
      )}
    </Screen>
  );
}
