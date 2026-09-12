"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Banner } from "@/components/Banner";
import { APP_NAME } from "@/constants/app";
import { useTranslation } from "@/i18n/use-translation";

const LAST_UPDATED = "12 September 2026";
const CONTACT_EMAIL = "jaideep.saindane@gmail.com";

export default function PrivacyPage() {
  const router = useRouter();
  const t = useTranslation();

  return (
    <Screen>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => router.back()}
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
        <h1 style={{ fontSize: "var(--font-title-size)" }}>{t.privacyPage.title}</h1>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Banner severity="watch">
          {t.privacyPage.disclaimer.replace(/\{name\}/g, APP_NAME)}
        </Banner>
      </div>

      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 16 }}>
        {t.privacyPage.lastUpdated} {LAST_UPDATED}
      </p>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.whoHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.whoBodyPrefix.replace(/\{name\}/g, APP_NAME)} <strong>{CONTACT_EMAIL}</strong>.
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.collectHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>
          {t.privacyPage.collectIntro.replace(/\{name\}/g, APP_NAME)}
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8, marginBottom: 8 }}>
          <li><strong>{t.privacyPage.accountInfoLabel}</strong> {t.privacyPage.accountInfoBody}</li>
          <li><strong>{t.privacyPage.tankDataLabel}</strong> {t.privacyPage.tankDataBody}</li>
          <li><strong>{t.privacyPage.aiHistoryLabel.replace(/\{name\}/g, APP_NAME)}</strong> {t.privacyPage.aiHistoryBody}</li>
          <li><strong>{t.privacyPage.usageSignalsLabel}</strong> {t.privacyPage.usageSignalsBody.replace(/\{name\}/g, APP_NAME)}</li>
        </ul>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.collectFooter.replace(/\{name\}/g, APP_NAME)}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.phoneLimitationHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.phoneLimitationBody.replace(/\{email\}/g, CONTACT_EMAIL)}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.whereDataLivesHeading}</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8 }}>
          <li><strong>{t.privacyPage.dbLabel}</strong> {t.privacyPage.dbBody}</li>
          <li><strong>{t.privacyPage.photosLabel}</strong> {t.privacyPage.photosBody}</li>
          <li><strong>{t.privacyPage.appLabel}</strong> {t.privacyPage.appBody}</li>
          <li><strong>{t.privacyPage.catalogLabel}</strong> {t.privacyPage.catalogBody}</li>
        </ul>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.aiProvidersHeading}</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.8, marginBottom: 8 }}>
          <li>{t.privacyPage.aiProvidersBullet1.replace(/\{name\}/g, APP_NAME)}</li>
          <li>{t.privacyPage.aiProvidersBullet2}</li>
        </ul>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          <strong>{t.privacyPage.medicationDisclaimer}</strong>
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.dataIsYoursHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.dataIsYoursBody}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.deletingHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.deletingBody1.replace(/\{email\}/g, CONTACT_EMAIL)}
        </p>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginTop: 8 }}>
          {t.privacyPage.deletingBody2}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.retentionHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.retentionBody}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.whoCanSeeHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.whoCanSeeBody.replace(/\{name\}/g, APP_NAME)}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.ageHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.ageBody.replace(/\{name\}/g, APP_NAME).replace(/\{email\}/g, CONTACT_EMAIL)}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.securityHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.securityBody.replace(/\{email\}/g, CONTACT_EMAIL)}
        </p>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.changesHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.changesBody.replace(/\{name\}/g, APP_NAME)}
        </p>
      </Card>

      <Card>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{t.privacyPage.questionsHeading}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
          {t.privacyPage.questionsBodyPrefix} <strong>{CONTACT_EMAIL}</strong> {t.privacyPage.questionsBodySuffix}
        </p>
      </Card>
    </Screen>
  );
}
