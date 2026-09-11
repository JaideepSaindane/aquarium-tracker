"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * A reusable crop step for any "add a photo" flow (2026-09-11, Jaideep's
 * ask: "allow people to crop their selected or captured images
 * everywhere"). Fixed-aspect frame, drag to pan, slider to zoom — the same
 * shape as a typical avatar/photo cropper. Deliberately NOT wired into the
 * AI-analysis photo flows (Tank Scan/Health Check, species photo-ID, the
 * Dex "suggest a species" scan) — those send the photo straight to a
 * model that benefits from the full original framing, and adding a crop
 * step there would only add friction to an already multi-step flow. Wired
 * into PhotoPickerButton and TankAvatar instead, which between them cover
 * every place a photo is actually saved and displayed to people (tank
 * photos, profile photo, Journal, Gallery, Community posts).
 */
export function ImageCropModal({
  file,
  aspect = 4 / 3,
  onCancel,
  onCropped,
}: {
  file: File;
  /** width / height of the crop frame. 1 for a circular avatar context. */
  aspect?: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState(320);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // Genuine external-resource sync (see TankAvatar.tsx's identical
    // pattern/comment) — createObjectURL allocates a real browser resource
    // that needs a matching revoke on cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageUrl(url);
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    function updateSize() {
      const max = Math.min(360, window.innerWidth - 48);
      setFrameSize(max);
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const frameW = frameSize;
  const frameH = frameSize / aspect;

  const coverScale = useMemo(() => {
    if (!natural) return 1;
    return Math.max(frameW / natural.w, frameH / natural.h);
  }, [natural, frameW, frameH]);

  const displayScale = coverScale * zoom;
  const displayW = natural ? natural.w * displayScale : 0;
  const displayH = natural ? natural.h * displayScale : 0;

  function clampOffset(x: number, y: number) {
    const minX = frameW - displayW;
    const minY = frameH - displayH;
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  }

  // Re-clamp whenever zoom (or the image itself) changes the display size —
  // genuinely depends on the *previous* offset plus the new bounds, so it
  // can't be computed during render the way a plain derived value could.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset((o) => clampOffset(o.x, o.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayW, displayH]);

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: offset.x, startOffsetY: offset.y };
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.startOffsetX + dx, dragRef.current.startOffsetY + dy));
  }
  function handlePointerUp() {
    dragRef.current = null;
  }

  async function handleConfirm() {
    if (!natural || !imageUrl) return;
    const img = new Image();
    img.src = imageUrl;
    await img.decode();

    const sx = -offset.x / displayScale;
    const sy = -offset.y / displayScale;
    const sw = frameW / displayScale;
    const sh = frameH / displayScale;

    const outW = Math.round(Math.min(1600, Math.max(400, sw)));
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCropped(new File([blob], file.name.replace(/\.\w+$/, "") + "-cropped.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <p style={{ color: "#fff", fontWeight: 600, marginBottom: 12 }}>Adjust your photo</p>

      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: frameW,
          height: frameH,
          overflow: "hidden",
          position: "relative",
          borderRadius: aspect === 1 ? "50%" : "var(--radius-lg)",
          touchAction: "none",
          cursor: "grab",
          background: "#111",
        }}
      >
        {imageUrl && natural && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: offset.x,
              top: offset.y,
              width: displayW,
              height: displayH,
              maxWidth: "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <input
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        style={{ width: frameW, marginTop: 16 }}
        aria-label="Zoom"
      />

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: "10px 20px", borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.3)", background: "none", color: "#fff", fontWeight: 600 }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!natural}
          style={{ padding: "10px 20px", borderRadius: "var(--radius-md)", border: "none", background: "var(--color-deep)", color: "#fff", fontWeight: 700 }}
        >
          Use photo
        </button>
      </div>
    </div>
  );
}
