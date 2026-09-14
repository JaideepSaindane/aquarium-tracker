"use client";

import { useRef, useState } from "react";
import { SecondaryButton } from "@/components/Button";
import { useTranslation } from "@/i18n/use-translation";

/**
 * A button that offers "Open Camera" vs "Choose from Gallery" as two
 * explicit choices, instead of a single file input whose `capture`
 * absence makes mobile browsers default to the gallery — the same gap
 * already fixed once for the tank photo picker (`TankAvatar.tsx`, see
 * specs/PROGRESS.md's "Tank photo picker only ever opened the gallery"
 * entry). Reused here so every "add a photo" spot in the app gets a real
 * camera option, not just the one screen that happened to get fixed first.
 *
 * 2026-09-14: when `acceptVideo` is on, the camera input briefly used a
 * combined `accept="image/*,video/*"` — which broke `capture` on real
 * devices (Jaideep: "I selected Take a picture, but it's still taking me
 * to the gallery"). Mobile browsers only honour `capture` reliably against
 * a single-category accept list. A three-button version (photo/video/
 * gallery) fixed that but Jaideep asked for exactly two buttons back:
 * "Open Camera" / "Choose from Gallery" — no photo-vs-video split in the
 * UI. So "Open Camera" opens the photo-only camera input (the common
 * case, and the one `capture` can actually guarantee); video is picked
 * via "Choose from Gallery", whose combined accept list is safe here
 * since that input never sets `capture` at all — on Android/iOS that
 * gallery/file chooser itself still surfaces a "Camera" shortcut if
 * someone wants to record a fresh video, just not guaranteed to jump
 * straight into video-recording mode the way a dedicated button would.
 */
export function PhotoPickerButton({
  label,
  onPick,
  acceptVideo = false,
}: {
  label: string;
  onPick: (file: File) => void;
  /** Also allow picking a video from the gallery, not just photos (community posts, 2026-09-14 "add vid support"). */
  acceptVideo?: boolean;
}) {
  const t = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={acceptVideo ? "image/*,video/*" : "image/*"}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
      <SecondaryButton onClick={() => setPickerOpen((v) => !v)}>{label}</SecondaryButton>
      {pickerOpen && (
        <>
          <div onClick={() => setPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} aria-hidden />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 6,
              zIndex: 30,
              background: "var(--color-surface)",
              border: "1px solid var(--color-line-soft)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lift)",
              overflow: "hidden",
              minWidth: 200,
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 4,
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
                background: "var(--color-deep-soft)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-body-sm-size)",
                fontWeight: 600,
                color: "var(--color-deep)",
                cursor: "pointer",
              }}
            >
              📷 {t.photoPicker.openCamera}
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
                background: "var(--color-deep-soft)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-body-sm-size)",
                fontWeight: 600,
                color: "var(--color-deep)",
                cursor: "pointer",
              }}
            >
              🖼️ {t.photoPicker.chooseFromGallery}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
