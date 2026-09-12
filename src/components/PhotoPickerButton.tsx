"use client";

import { useRef, useState } from "react";
import { SecondaryButton } from "@/components/Button";
import { useTranslation } from "@/i18n/use-translation";

/**
 * A button that offers "Take photo" (camera) vs "Choose from gallery" as
 * two explicit choices, instead of a single file input whose `capture`
 * absence makes mobile browsers default to the gallery — the same gap
 * already fixed once for the tank photo picker (`TankAvatar.tsx`, see
 * specs/PROGRESS.md's "Tank photo picker only ever opened the gallery"
 * entry). Reused here so every "add a photo" spot in the app gets a real
 * camera option, not just the one screen that happened to get fixed first.
 */
export function PhotoPickerButton({ label, onPick }: { label: string; onPick: (file: File) => void }) {
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
        accept="image/*"
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
              📷 {t.dexPage.takePhoto}
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
              🖼️ {t.dexPage.chooseFromGallery}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
