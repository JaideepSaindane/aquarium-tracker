"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { SecondaryButton, DangerButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { TankAvatar } from "@/components/TankAvatar";
import { ListRow } from "@/components/ListRow";
import { APP_NAME } from "@/constants/app";
import { getProfile, saveProfile } from "@/db/queries/profile";
import { isSurvivalPromptDisabled, disableSurvivalPromptForever } from "@/db/queries/settings";
import { clearIntroPlayed } from "@/lib/intro-session";
import { useTranslation } from "@/i18n/use-translation";
import { useLocale } from "@/i18n/use-locale";
import { useTheme } from "@/theme/ThemeProvider";
import { useUnitsContext } from "@/lib/UnitsProvider";

/**
 * Redesign Section 9 ("a conventional, scannable settings architecture",
 * 2026-09-13). This screen used to be one long stack of Cards mixing
 * editable profile fields, three embedded SegmentedControls, conditional
 * account-linking forms, plan info, sign-out, delete-account, and export/
 * import all at once — every one of them a full-height control regardless
 * of how often it's touched. Split per the brief:
 *  - Profile becomes "the person": avatar + name, an "Edit profile ›" row
 *    (the actual fields moved to `/settings/edit-profile`).
 *  - Preferences: Language/Appearance/Units are now list rows showing the
 *    current value with a chevron, each opening its own tiny screen
 *    (`/settings/language`, `/settings/appearance`, `/settings/units`)
 *    instead of three always-expanded SegmentedControls stacked here.
 *  - Plan: unchanged in substance (already a compact card).
 *  - Account: "Export data ›" (`/settings/export`) and "Manage sign-in ›"
 *    (`/settings/account`, for the conditional phone/Google linking forms)
 *    are list rows; Sign out is a direct one-tap row right here, per the
 *    brief's own "Account (Export data, Sign out)" wording.
 *  - Danger zone: Delete my account, visually separated (a red-tinted
 *    border) from everything else on the screen, not just another Card in
 *    the same stack — so a destructive action never blends in with routine
 *    settings.
 *  - More: Share/Privacy/About plus the two lower-traffic toggles
 *    (restart onboarding, fish check-ins) as plain list rows instead of
 *    a collapsed generic "More" accordion — the old accordion buried
 *    export/import (a real, promised feature, Principle 4) behind a
 *    disclosure triangle; that's gone now that export has its own row.
 */
export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslation();
  const { locale } = useLocale();
  const { theme } = useTheme();
  const { units } = useUnitsContext();

  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  const [survivalPromptOff, setSurvivalPromptOff] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      if (!p) return;
      setProfileName(p.name ?? "");
      setProfileUsername(p.username ?? "");
      setProfilePhotoUri(p.photoUri ?? null);
    });
    isSurvivalPromptDisabled().then(setSurvivalPromptOff);
  }, []);

  async function handleShareApp() {
    setShareMessage(null);
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const shareData = { title: APP_NAME, text: `Track your aquarium with ${APP_NAME}`, url };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled the share sheet — not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage(t.settingsPage.linkCopied);
    } catch {
      setShareMessage(url);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t.settingsPage.couldNotDeleteAccount);
      }
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t.settingsPage.couldNotDeleteAccount);
      setDeleting(false);
    }
  }

  const languageLabel = locale === "hi-latn" ? t.settingsPage.hinglish : t.settingsPage.english;
  const themeLabel = theme === "light" ? t.settingsPage.themeLight : theme === "dark" ? t.settingsPage.themeDark : t.settingsPage.themeSystem;
  const unitsLabel = units === "imperial" ? t.settingsPage.unitsImperial : t.settingsPage.unitsMetric;

  return (
    <Screen>
      <BackHeader title={t.settings.title} fallbackHref="/" />

      {/* Profile — the person, not a form */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <TankAvatar photoUri={profilePhotoUri} size={64} fallbackIcon="👤" />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--font-body-size)" }}>{profileName || t.home.aquarist}</p>
            {profileUsername && <p style={{ margin: 0, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>@{profileUsername}</p>}
          </div>
        </div>
        <ListRow label={t.settingsPage.editProfile} showChevron onClick={() => router.push("/settings/edit-profile")} />
      </Card>

      {/* Preferences */}
      <Card style={{ marginBottom: 16 }}>
        <ListRow label={t.settings.languageTitle} meta={languageLabel} showChevron onClick={() => router.push("/settings/language")} />
        <ListRow label={t.settingsPage.appearance} meta={themeLabel} showChevron onClick={() => router.push("/settings/appearance")} />
        <ListRow label={t.settingsPage.units} meta={unitsLabel} showChevron onClick={() => router.push("/settings/units")} />
      </Card>

      {/* Plan */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)" }}>{t.settingsPage.yourPlan}</h2>
          <span
            style={{
              background: "var(--color-improve)",
              color: "#fff",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: "var(--font-caption-size)",
              fontWeight: 600,
            }}
          >
            🐦 {t.settingsPage.earlyBird}
          </span>
        </div>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.settingsPage.proNotBuilt}</p>
        <details>
          <summary style={{ cursor: "pointer", color: "var(--color-deep)", fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>
            {t.settingsPage.whatHappensWhenPro}
          </summary>
          <div style={{ marginTop: 8, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.6 }}>
            <p style={{ marginBottom: 8 }}>{t.settingsPage.stayFreeForever}</p>
            <p style={{ marginBottom: 8 }}>
              <strong>{t.settingsPage.earlyBirdHonoured}</strong> {t.settingsPage.earlyBirdDeal}
            </p>
            <p>{t.settingsPage.ifDevelopmentStops}</p>
          </div>
        </details>
      </Card>

      {/* Account */}
      <Card style={{ marginBottom: 16 }}>
        <ListRow label={t.settingsPage.exportData} meta={t.settingsPage.exportDataMeta} showChevron onClick={() => router.push("/settings/export")} />
        <ListRow label={t.settingsPage.manageSignIn} meta={t.settingsPage.signInMethodsMeta} showChevron onClick={() => router.push("/settings/account")} />
        <ListRow label={t.settingsPage.signOut} onClick={() => signOut({ callbackUrl: "/login" })} />
      </Card>

      {/* Danger zone — visually separated so a destructive action never
          blends in with routine settings above it. */}
      <Card style={{ marginBottom: 16, border: "1px solid var(--color-fix-now)" }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4, color: "var(--color-fix-now)" }}>{t.settingsPage.dangerZone}</h2>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{t.settingsPage.deleteMyAccount}</p>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.settingsPage.deleteAccountBody}</p>
        {!showDeleteConfirm ? (
          <DangerButton onClick={() => setShowDeleteConfirm(true)}>{t.settingsPage.deleteMyAccount}</DangerButton>
        ) : (
          <div>
            <p style={{ fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>
              {t.settingsPage.typeDeleteToConfirm} <strong>DELETE</strong> {t.settingsPage.toConfirmPermanent}
            </p>
            <Field label="" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" />
            {deleteError && (
              <div style={{ marginTop: 8 }}>
                <Banner severity="fixNow">{deleteError}</Banner>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <SecondaryButton
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
              >
                {t.common.cancel}
              </SecondaryButton>
              <DangerButton onClick={handleDeleteAccount} disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE" || deleting}>
                {deleting ? t.settingsPage.deleting : t.settingsPage.permanentlyDeleteAccount}
              </DangerButton>
            </div>
          </div>
        )}
      </Card>

      {/* More */}
      <Card>
        <ListRow label={t.settingsPage.shareThisApp} onClick={handleShareApp} />
        <Link href="/privacy" style={{ display: "block" }}>
          <ListRow label={t.settingsPage.privacyPolicy} showChevron />
        </Link>
        <Link href="/about" style={{ display: "block" }}>
          <ListRow label={t.settingsPage.aboutApp.replace("{name}", APP_NAME)} showChevron />
        </Link>
        <ListRow
          label={t.settings.startOver}
          meta={t.settingsPage.onboardingBody}
          onClick={async () => {
            await saveProfile({ onboardingCompletedAt: null });
            clearIntroPlayed();
            router.push("/onboarding");
          }}
        />
        <ListRow
          label={survivalPromptOff ? t.settingsPage.fishCheckIns : t.settingsPage.turnOffCheckIns}
          meta={survivalPromptOff ? t.settingsPage.turnedOff : t.settingsPage.fishCheckInsBody}
          onClick={
            survivalPromptOff
              ? undefined
              : async () => {
                  await disableSurvivalPromptForever();
                  setSurvivalPromptOff(true);
                }
          }
        />
        {shareMessage && (
          <div style={{ marginTop: 12 }}>
            <Banner severity="neutral">{shareMessage}</Banner>
          </div>
        )}
      </Card>
    </Screen>
  );
}
