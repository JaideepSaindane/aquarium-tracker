"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Standard top-left back button + optional title, used on every screen
 * except the three bottom-nav tabs (My Tanks, Dex, Community) — those are
 * the app's roots and have nothing to go "back" to. Falls back to `fallbackHref`
 * when there's no real history to go back to (e.g. this page was opened
 * directly, or is the first screen in a flow) — `router.back()` alone would
 * otherwise silently do nothing.
 */
export function BackHeader({ title, fallbackHref, right }: { title?: ReactNode; fallbackHref?: string; right?: ReactNode }) {
  const router = useRouter();
  const t = useTranslation();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref ?? "/");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: title ? 16 : 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <button
          type="button"
          onClick={handleBack}
          aria-label={t.common.back}
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "1px solid var(--color-line)",
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ←
        </button>
        {title && <h1 style={{ fontSize: "var(--font-title-size)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h1>}
      </div>
      {right}
    </div>
  );
}
