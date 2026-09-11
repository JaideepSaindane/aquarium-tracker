"use client";

import { useEffect, useRef, useState } from "react";
import { readPhotoFile } from "@/lib/opfs-files";
import { isRemotePhotoUrl } from "@/lib/use-photo-src";
import { ImageCropModal } from "@/components/ImageCropModal";

/**
 * Circular tank avatar: shows the tank's photo if it has one, otherwise a
 * plain fish icon on a blue background — matching the reference flow
 * Jaideep shared, minus its color picker (deliberately dropped, per his
 * feedback: "I just don't like the colour selector"). When `onPhotoChange`
 * is given, a small camera badge lets the user pick/replace the photo.
 */
export function TankAvatar({
  photoUri,
  previewFile,
  size = 96,
  onPhotoChange,
  fallbackIcon = "🐟",
}: {
  photoUri?: string | null;
  /** A just-picked File not written to OPFS yet (e.g. tank creation, before the tank row exists) — shown immediately instead of waiting on photoUri. */
  previewFile?: File | null;
  size?: number;
  onPhotoChange?: (file: File) => void;
  /** What to show when there's no photo yet — the fish icon fits a tank, but this component is also reused for the profile photo (Settings), which wants a person icon instead. */
  fallbackIcon?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // A freshly-picked File (nowhere on disk yet) previews instantly from
    // the File itself — no need to wait for it to round-trip through OPFS
    // and a photoUri prop update, which for tank creation never happens
    // until Confirm is tapped (specs/PROGRESS.md 2026-09-02, Jaideep: "once
    // photo is clicked, it should immediately be set as the tank's icon").
    if (previewFile) {
      const objectUrl = URL.createObjectURL(previewFile);
      // Genuine external-resource sync, not a derivable-during-render value
      // — createObjectURL allocates a real browser resource that needs a
      // matching revoke on cleanup, so it can't move into a lazy useState
      // initializer without leaking a URL on every re-render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      if (!photoUri) {
        setUrl(null);
        return;
      }
      // A real https Blob URL (see src/lib/photo-upload.ts) is used
      // directly; a legacy OPFS-relative path still goes through the
      // read-then-object-URL dance.
      if (isRemotePhotoUrl(photoUri)) {
        setUrl(photoUri);
        return;
      }
      const blob = await readPhotoFile(photoUri);
      if (blob && !cancelled) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    }
    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoUri, previewFile]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--color-deep)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span aria-hidden style={{ fontSize: size * 0.45 }}>
            {fallbackIcon}
          </span>
        )}
      </div>
      {onPhotoChange && cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={1}
          onCancel={() => setCropFile(null)}
          onCropped={(cropped) => {
            setCropFile(null);
            onPhotoChange(cropped);
          }}
        />
      )}
      {onPhotoChange && (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setCropFile(file);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setCropFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            aria-label="Change photo"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((v) => !v)}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            📷
          </button>
          {pickerOpen && (
            <>
              {/* Tap-outside-to-close scrim — cheaper than a click-outside hook for a two-button menu. */}
              <div
                onClick={() => setPickerOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 29 }}
                aria-hidden
              />
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 6,
                  zIndex: 30,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line-soft)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lift)",
                  overflow: "hidden",
                  minWidth: 160,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    fontSize: "var(--font-body-sm-size)",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    cursor: "pointer",
                  }}
                >
                  📷 Take photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    galleryInputRef.current?.click();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderTop: "1px solid var(--color-line-soft)",
                    fontSize: "var(--font-body-sm-size)",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    cursor: "pointer",
                  }}
                >
                  🖼️ Choose from gallery
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
