"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { APP_NAME } from "@/constants/app";

export default function PrivacyPage() {
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
        <h1 style={{ fontSize: "var(--font-title-size)" }}>Privacy</h1>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Banner severity="watch">
          This describes how {APP_NAME} actually handles data today — it is not yet a formally published, legally reviewed
          privacy policy. Treat it as an honest in-app explanation, not a final legal document.
        </Banner>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Your tank data stays on your device</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          Tanks, fish, plants, equipment, measurements, journal entries, and photos are stored locally in your browser
          (SQLite, in a private per-origin file area). Nothing is uploaded to a server just by using the app. There is no
          account and no sign-in.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>What does leave your device</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8 }}>
          <li>Tank Scan, Ask {APP_NAME}, Emergency Triage, compatibility checks, and photo species-ID send the photo/question/tank details you choose to submit to our server, which forwards it to an AI provider (Google Gemini, or Anthropic Claude in some cases) to generate a response. Only what a feature genuinely needs is sent — not your whole database.</li>
          <li>If you use &quot;bring your own API key&quot; mode, your key is used only in your browser for that session and is never sent to or stored on our server.</li>
        </ul>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Your data is yours</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          You can export everything — full JSON, CSV spreadsheets, and your photos — at any time from Settings, at no
          cost, with no account required. Deleting the app or clearing site data removes everything stored locally.
        </p>
      </Card>

      <Card>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>Questions</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {APP_NAME} is under active development and this page will be replaced by a formally reviewed privacy policy
          before public launch.
        </p>
      </Card>
    </Screen>
  );
}
