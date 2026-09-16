"use client";

import { useEffect, useState } from "react";

/**
 * A permanent bar across the top whenever an admin is inside someone else's
 * account read-only (src/server/auth/view-as.ts). It exists so nobody can
 * ever be confused about whose data is on screen — the whole app looks
 * identical otherwise. Writes are refused by src/proxy.ts, not by this
 * banner; this is the label, not the lock.
 */
export function ViewAsBanner() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/view-as")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.viewing?.label) setLabel(d.viewing.label as string);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!label) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 14px",
        background: "#3d2b00",
        color: "#ffd479",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span>Viewing {label} — read only</span>
      <button
        onClick={async () => {
          await fetch("/api/view-as/exit", { method: "POST" });
          // A hard navigation on purpose, not router.push: the cookie that
          // made every server component render as the other user is gone,
          // so the whole page tree has to be re-fetched from scratch.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/admin";
        }}
        style={{
          background: "#ffd479",
          color: "#3d2b00",
          border: "none",
          borderRadius: 999,
          padding: "5px 12px",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        Exit
      </button>
    </div>
  );
}
