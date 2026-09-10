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
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>You need an account, and your core data is stored on our server</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          As of 2026-09-10, {APP_NAME} requires signing in — either with Google, or a phone number and a 4-digit PIN you
          choose yourself. Your tanks, fish, and water-parameter logs are stored on our server (Postgres via Neon),
          scoped to your account, so they follow you across devices. Some data (plants, equipment, journal entries,
          photos, species catalog progress) still lives only in this browser&apos;s local storage for now, mid-migration to
          the server — it won&apos;t yet follow you to a new device.
        </p>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginTop: 8 }}>
          Signing up with a phone number does not verify that the number is actually yours — there is no SMS code. Your
          PIN is the only thing protecting that account; choose one that isn&apos;t easily guessed, and note that there
          is currently no self-serve way to recover a forgotten PIN.
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
          cost. This includes both your server-stored data and whatever&apos;s still local to this device. Deleting the
          app or clearing site data removes only the local portion; your server-stored data stays tied to your
          account until you delete it.
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
