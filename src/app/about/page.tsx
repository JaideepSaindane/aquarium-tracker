"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { APP_NAME } from "@/constants/app";

export default function AboutPage() {
  const router = useRouter();

  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
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
        <h1 style={{ fontSize: "var(--font-title-size)" }}>About {APP_NAME}</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 12 }}>
          {APP_NAME} is a mobile-first app for freshwater and planted aquariums — from &quot;I think I want fish&quot; to a
          thriving tank. Point your camera at a tank and get a structured report: detected livestock, plants, algae,
          equipment, and a ranked list of what to do next.
        </p>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          Freshwater and planted only — not reef, not marine.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>What we believe</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8 }}>
          <li>We advise, never block — your tank is always recorded honestly, warnings never stop you from saving.</li>
          <li>Species care, disease reference, and emergency triage are free forever — we sell compute and continuity, not facts.</li>
          <li>Your data is yours — full export, no account required.</li>
          <li>The app works at the tank, offline — the network is an enhancement, never a dependency.</li>
        </ul>
      </Card>

      <Card>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Version</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {APP_NAME} is under active development. &quot;{APP_NAME}&quot; is a working title, not final.
        </p>
      </Card>
    </Screen>
  );
}
