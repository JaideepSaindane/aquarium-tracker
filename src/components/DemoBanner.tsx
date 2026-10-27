"use client";

import { useSession } from "next-auth/react";

/**
 * A thin bar across the top of every screen while signed in to the shared
 * judges' demo account (2026-10-27, Jaideep: "a very thin banner that says
 * 'demo account' in small font, like a blue bar at the top"). In normal
 * page flow, not fixed, so it pushes content down instead of covering any
 * screen's header.
 */
export function DemoBanner() {
  const { data } = useSession();
  if (!data?.user?.isDemo) return null;

  return (
    <div
      style={{
        background: "var(--color-deep)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        lineHeight: "18px",
        textAlign: "center",
      }}
    >
      Demo account
    </div>
  );
}
