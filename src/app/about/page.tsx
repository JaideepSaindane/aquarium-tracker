"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { APP_NAME } from "@/constants/app";
import { useTranslation } from "@/i18n/use-translation";

export default function AboutPage() {
  const router = useRouter();
  const t = useTranslation();

  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t.aboutPage.back}
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
        <h1 style={{ fontSize: "var(--font-title-size)" }}>{t.aboutPage.title} {APP_NAME}</h1>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 12 }}>
          {APP_NAME} {t.aboutPage.intro}
        </p>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.aboutPage.freshwaterOnly}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.aboutPage.whatWeBelieve}</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8 }}>
          <li>{t.aboutPage.belief1}</li>
          <li>{t.aboutPage.belief2}</li>
          <li>{t.aboutPage.belief3}</li>
          <li>{t.aboutPage.belief4}</li>
        </ul>
      </Card>

      <Card>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.aboutPage.version}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {APP_NAME} {t.aboutPage.versionBody}
        </p>
      </Card>
    </Screen>
  );
}
