"use client";

import { useRef, useState } from "react";

function distance(t1: React.Touch, t2: React.Touch): number {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

/**
 * Full-screen photo view with pinch-to-zoom and drag-to-pan — hand-rolled
 * touch handling, no gesture library. specs/T-022 calls this out
 * specifically as "currently broken in Aquarium Log — a small, real
 * differentiator," so it's worth getting right rather than skipping.
 */
export function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTap = useRef(0);

  function handleTouchStart(e: React.TouchEvent) {
    setIsGesturing(true);
    if (e.touches.length === 2) {
      pinchStart.current = { distance: distance(e.touches[0], e.touches[1]), scale };
      dragStart.current = null;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        // double-tap: reset
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        pinchStart.current = null;
        dragStart.current = null;
        return;
      }
      lastTap.current = now;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: translate.x, ty: translate.y };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStart.current) {
      const d = distance(e.touches[0], e.touches[1]);
      const next = Math.min(4, Math.max(1, pinchStart.current.scale * (d / pinchStart.current.distance)));
      setScale(next);
    } else if (e.touches.length === 1 && dragStart.current && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setTranslate({ x: dragStart.current.tx + dx, y: dragStart.current.ty + dy });
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length === 0) {
      pinchStart.current = null;
      dragStart.current = null;
      setIsGesturing(false);
      if (scale <= 1) setTranslate({ x: 0, y: 0 });
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => scale === 1 && onClose()}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 18 }}
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- OPFS blob URL, not a next/image candidate */}
      <img
        src={src}
        alt=""
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: isGesturing ? "none" : "transform 0.15s ease-out",
        }}
      />
      {scale === 1 && (
        <p style={{ position: "absolute", bottom: 24, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Pinch to zoom · double-tap to reset</p>
      )}
    </div>
  );
}
