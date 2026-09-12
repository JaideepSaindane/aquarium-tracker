"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { TankAvatar } from "@/components/TankAvatar";
import { SegmentedControl } from "@/components/SegmentedControl";
import { APP_NAME } from "@/constants/app";
import { ensureDb } from "@/db/client";
import { buildJsonExport, buildCsvZip, buildPhotosZip, downloadBlob } from "@/lib/export";
import { importJsonExport } from "@/lib/import";
import { getProfile, saveProfile } from "@/db/queries/profile";
import { isSurvivalPromptDisabled, disableSurvivalPromptForever } from "@/db/queries/settings";
import { uploadPhoto } from "@/lib/photo-upload";
import { useTranslation } from "@/i18n/use-translation";
import { useLocale } from "@/i18n/use-locale";
import { useTheme, type ThemeChoice } from "@/theme/ThemeProvider";
import { useUnitsContext } from "@/lib/UnitsProvider";
import type { Locale } from "@/i18n/types";
import type { UnitSystem } from "@/lib/units";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslation();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { units, setUnits } = useUnitsContext();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileContact, setProfileContact] = useState("");
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const [survivalPromptOff, setSurvivalPromptOff] = useState(false);

  const [hasPhoneLinked, setHasPhoneLinked] = useState<boolean | null>(null); // null = still checking
  const [hasGoogleLinked, setHasGoogleLinked] = useState<boolean | null>(null);
  const [googleLinkError, setGoogleLinkError] = useState<string | null>(null);
  const [linkPhone, setLinkPhone] = useState("");
  const [linkPin, setLinkPin] = useState("");
  const [linkPinConfirm, setLinkPinConfirm] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  useEffect(() => {
    ensureDb();
    getProfile().then((p) => {
      if (p) {
        setProfileName(p.name ?? "");
        setProfileUsername(p.username ?? "");
        setProfileCity(p.city ?? "");
        setProfileEmail(p.email ?? "");
        setProfileContact(p.contact ?? "");
        setProfilePhotoUri(p.photoUri ?? null);
      }
    });
    isSurvivalPromptDisabled().then(setSurvivalPromptOff);
    fetch("/api/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((info) => {
        // fail closed: don't show either card if we couldn't check
        setHasPhoneLinked(info ? info.hasPhone : true);
        setHasGoogleLinked(info ? info.hasGoogle : true);
      })
      .catch(() => {
        setHasPhoneLinked(true);
        setHasGoogleLinked(true);
      });

    // Landed back here from the Google linking redirect (src/auth.ts's
    // signIn callback) — the only failure mode it returns is a conflict:
    // this Google account already belongs to a different existing account.
    // Reading the URL the browser actually landed on after a full-page
    // OAuth redirect (src/auth.ts's signIn callback) — a genuine one-time
    // external-state sync on mount, not derivable during render.
    const params = new URLSearchParams(window.location.search);
    if (params.get("linkError") === "conflict") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoogleLinkError("That Google account is already linked to a different AquaAI account — sign in with that account directly instead, or use a different Google account.");
      window.history.replaceState(null, "", "/settings");
    } else if (params.get("linked") === "google") {
      window.history.replaceState(null, "", "/settings");
    }
  }, []);

  async function handleLinkPhone() {
    setLinkMessage(null);
    if (linkPin !== linkPinConfirm) {
      setLinkMessage(t.settingsPage.pinsDontMatch);
      return;
    }
    setLinkBusy(true);
    try {
      const res = await fetch("/api/account/link-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: linkPhone.trim(), pin: linkPin.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setLinkMessage(body.error ?? t.settingsPage.couldNotAddPhone);
        return;
      }
      setHasPhoneLinked(true);
      setLinkPhone("");
      setLinkPin("");
      setLinkPinConfirm("");
      setLinkMessage(null);
    } catch (err) {
      setLinkMessage(`${t.settingsPage.couldNotSave} ${String(err)}`);
    } finally {
      setLinkBusy(false);
    }
  }

  async function handleProfilePhoto(file: File) {
    // Uploads to Vercel Blob (2026-09-11), not OPFS — the profile itself
    // is already server-backed (per-account, not per-device), so the photo
    // needs to be reachable from any device too, not just this one.
    setProfileMessage(null);
    try {
      const url = await uploadPhoto(file);
      setProfilePhotoUri(url);
    } catch {
      setProfileMessage(t.settingsPage.couldNotUploadPhoto);
    }
  }

  async function handleSaveProfile() {
    setProfileBusy(true);
    setProfileMessage(null);
    try {
      await saveProfile({
        name: profileName.trim() || undefined,
        username: profileUsername.trim() || undefined,
        city: profileCity.trim() || undefined,
        email: profileEmail.trim() || undefined,
        contact: profileContact.trim() || undefined,
        photoUri: profilePhotoUri ?? undefined,
      });
      setProfileMessage(t.settingsPage.saved);
    } catch (err) {
      setProfileMessage(`${t.settingsPage.couldNotSave} ${String(err)}`);
    } finally {
      setProfileBusy(false);
    }
  }

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
    setBusy("delete-account");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t.settingsPage.couldNotDeleteAccount);
      }
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t.settingsPage.couldNotDeleteAccount);
      setBusy(null);
    }
  }

  async function withBusy(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage(`${t.settingsPage.somethingWentWrong} ${String(err)}`);
    } finally {
      setBusy(null);
    }
  }

  // Exports always download directly now (2026-09-11) rather than
  // offering to go through the Web Share API first — Jaideep hit a real
  // case on Android where sharing a JSON export handed it off to a save
  // target that renamed it with a wrong extension (".app" instead of
  // ".json"). The file itself was always named correctly; it's the
  // receiving app in the share sheet that can't be trusted to keep it. A
  // plain browser download is the one path that reliably preserves the
  // exact filename, which matters far more here than the share
  // convenience — this is a data backup, not something worth risking a
  // silently-mislabelled file for.
  async function handleExportJson() {
    await withBusy("json", async () => {
      const data = await buildJsonExport();
      const bytes = JSON.stringify(data, null, 2);
      const filename = `${APP_NAME.toLowerCase()}-export-${timestamp()}.json`;
      downloadBlob(bytes, filename, "application/json");
      setMessage(t.settingsPage.downloadedJson);
    });
  }

  async function handleExportCsv() {
    await withBusy("csv", async () => {
      const zip = await buildCsvZip();
      const filename = `${APP_NAME.toLowerCase()}-tables-${timestamp()}.zip`;
      downloadBlob(zip, filename, "application/zip");
      setMessage(t.settingsPage.downloadedCsv);
    });
  }

  async function handleExportPhotos() {
    await withBusy("photos", async () => {
      const zip = await buildPhotosZip();
      const filename = `${APP_NAME.toLowerCase()}-photos-${timestamp()}.zip`;
      downloadBlob(zip, filename, "application/zip");
      setMessage(t.settingsPage.downloadedPhotos);
    });
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await withBusy("import", async () => {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importJsonExport(data);
      if (result.ok) {
        const total = Object.values(result.attempted).reduce((a, b) => a + b, 0);
        setMessage(
          t.settingsPage.importComplete
            .replace("{rows}", String(total))
            .replace("{tables}", String(Object.keys(result.attempted).length))
        );
      } else {
        setMessage(`${t.settingsPage.importFailed} ${result.error}`);
      }
    });
  }

  return (
    <Screen>
      <BackHeader title={t.settings.title} fallbackHref="/" />

      {/* My Info */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <TankAvatar photoUri={profilePhotoUri} size={88} onPhotoChange={handleProfilePhoto} fallbackIcon="👤" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Field label={t.settingsPage.name} value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder={t.settingsPage.optional} />
          <Field label={t.settingsPage.username} value={profileUsername} onChange={(e) => setProfileUsername(e.target.value)} placeholder={t.settingsPage.optional} />
          <Field label={t.settingsPage.city} value={profileCity} onChange={(e) => setProfileCity(e.target.value)} placeholder={t.settingsPage.optional} />
          <Field label={t.settingsPage.email} type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder={t.settingsPage.optional} />
          <Field label={t.settingsPage.contact} type="tel" value={profileContact} onChange={(e) => setProfileContact(e.target.value)} placeholder={t.settingsPage.optional} />
          <PrimaryButton onClick={handleSaveProfile} disabled={profileBusy}>
            {profileBusy ? t.settingsPage.saving : t.common.save}
          </PrimaryButton>
        </div>
        {profileMessage && (
          <div style={{ marginTop: 12 }}>
            <Banner severity="neutral">{profileMessage}</Banner>
          </div>
        )}
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 8 }}>{t.settings.profileSubtitle}</p>
      </Card>

      {/* Add phone sign-in — only shown to an account (in practice, a Google
          signup) that has no phone number linked yet. Without this, using
          Google once and phone+PIN another time silently creates two
          separate accounts with no shared data — see specs/PROGRESS.md's
          2026-09-10 entry. */}
      {hasPhoneLinked === false && (
        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.addPhoneSignIn}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
            {t.settingsPage.addPhoneSignInBody}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Field label={t.settingsPage.phoneNumber} type="tel" value={linkPhone} onChange={(e) => setLinkPhone(e.target.value)} placeholder="9876543210" />
            <Field label={t.settingsPage.fourDigitPin} type="password" value={linkPin} onChange={(e) => setLinkPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" />
            <Field
              label={t.settingsPage.confirmPin}
              type="password"
              value={linkPinConfirm}
              onChange={(e) => setLinkPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
            />
            <PrimaryButton onClick={handleLinkPhone} disabled={linkBusy || linkPhone.trim().length < 10 || linkPin.length !== 4}>
              {linkBusy ? t.settingsPage.adding : t.settingsPage.addPhoneSignIn}
            </PrimaryButton>
          </div>
          {linkMessage && (
            <div style={{ marginTop: 12 }}>
              <Banner severity="neutral">{linkMessage}</Banner>
            </div>
          )}
        </Card>
      )}

      {/* Link Google account — the reverse of the card above: for someone
          who signed up with phone+PIN first. Same reasoning (specs/
          PROGRESS.md's 2026-09-11 entry) — without this, signing in with
          Google for the first time on a new device silently creates a
          second, separate account instead of reaching the same data. This
          is a full-page redirect (Google's OAuth flow), not a fetch call —
          see /api/account/link-google. */}
      {hasGoogleLinked === false && (
        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.linkGoogleAccount}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
            {t.settingsPage.linkGoogleAccountBody}
          </p>
          {/* A full browser navigation, not router.push — this hits a route
              handler that sets a cookie and 307s on to Google's real OAuth
              consent screen, which client-side routing can't do. */}
          {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
          <SecondaryButton onClick={() => (window.location.href = "/api/account/link-google")}>{t.settingsPage.linkGoogleAccount}</SecondaryButton>
          {googleLinkError && (
            <div style={{ marginTop: 12 }}>
              <Banner severity="watch">{googleLinkError}</Banner>
            </div>
          )}
        </Card>
      )}

      {/* App settings */}
      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.appSettings}</h2>

        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "12px 0 6px" }}>{t.settings.languageTitle}</p>
        <div style={{ marginBottom: 16 }}>
          <SegmentedControl
            value={locale}
            onChange={(l) => setLocale(l as Locale)}
            options={[
              { value: "en", label: t.settingsPage.english },
              { value: "hi-latn", label: t.settingsPage.hinglish },
            ]}
          />
        </div>

        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "0 0 6px" }}>{t.settingsPage.appearance}</p>
        <div style={{ marginBottom: 16 }}>
          <SegmentedControl
            value={theme}
            onChange={(th) => setTheme(th as ThemeChoice)}
            options={[
              { value: "system", label: t.settingsPage.themeSystem },
              { value: "light", label: t.settingsPage.themeLight },
              { value: "dark", label: t.settingsPage.themeDark },
            ]}
          />
        </div>

        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "0 0 6px" }}>{t.settingsPage.units}</p>
        <SegmentedControl
          value={units}
          onChange={(u) => setUnits(u as UnitSystem)}
          options={[
            { value: "metric", label: t.settingsPage.unitsMetric },
            { value: "imperial", label: t.settingsPage.unitsImperial },
          ]}
        />
      </Card>

      {/* Your plan */}
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
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
          {t.settingsPage.proNotBuilt}
        </p>
        <details>
          <summary style={{ cursor: "pointer", color: "var(--color-deep)", fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>
            {t.settingsPage.whatHappensWhenPro}
          </summary>
          <div style={{ marginTop: 8, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.6 }}>
            <p style={{ marginBottom: 8 }}>
              {t.settingsPage.stayFreeForever}
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>
                {t.settingsPage.earlyBirdHonoured}
              </strong>{" "}
              {t.settingsPage.earlyBirdDeal}
            </p>
            <p>
              {t.settingsPage.ifDevelopmentStops}
            </p>
          </div>
        </details>
      </Card>

      {/* Real accounts, added 2026-09-10 — sign-out lives here since it's
          the natural "account" section of Settings. */}
      <Card style={{ marginBottom: 16 }}>
        <DangerButton onClick={() => signOut({ callbackUrl: "/login" })}>{t.settingsPage.signOut}</DangerButton>
      </Card>

      {/* Real self-serve account deletion (2026-09-12), built so the privacy
          policy can honestly point at something that exists instead of
          "email us to delete your data". Permanently deletes every tank,
          fish, log, photo, AI-chat history and Species Dex unlock tied to
          this account, server-side — irreversible, no undo. */}
      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.deleteMyAccount}</h2>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
          {t.settingsPage.deleteAccountBody}
        </p>
        {!showDeleteConfirm ? (
          <DangerButton onClick={() => setShowDeleteConfirm(true)}>{t.settingsPage.deleteMyAccount}</DangerButton>
        ) : (
          <div>
            <p style={{ fontSize: "var(--font-body-sm-size)", marginBottom: 8 }}>
              {t.settingsPage.typeDeleteToConfirm} <strong>DELETE</strong> {t.settingsPage.toConfirmPermanent}
            </p>
            <Field
              label=""
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
            />
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
              <DangerButton
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE" || busy === "delete-account"}
              >
                {busy === "delete-account" ? t.settingsPage.deleting : t.settingsPage.permanentlyDeleteAccount}
              </DangerButton>
            </div>
          </div>
        )}
      </Card>

      {/* Share / Privacy / About */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SecondaryButton onClick={handleShareApp}>📤 {t.settingsPage.shareThisApp}</SecondaryButton>
          <Link href="/privacy">
            <SecondaryButton>🔒 {t.settingsPage.privacyPolicy}</SecondaryButton>
          </Link>
          <Link href="/about">
            <SecondaryButton>ℹ️ {t.settingsPage.aboutApp.replace("{name}", APP_NAME)}</SecondaryButton>
          </Link>
        </div>
        {shareMessage && (
          <div style={{ marginTop: 12 }}>
            <Banner severity="neutral">{shareMessage}</Banner>
          </div>
        )}
      </Card>

      {/* Everything else — real functionality, tucked away to keep the main screen sleek.
          Named plainly (not just "More") since data export is a stated core promise,
          not something a returning user should have to guess is hidden behind a triangle. */}
      <details>
        <summary style={{ cursor: "pointer", color: "var(--color-ink)", fontWeight: 700, fontSize: "var(--font-body-size)", padding: "10px 0" }}>
          {t.settingsPage.moreSummary}
        </summary>

        <div style={{ height: 8 }} />

        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settings.exportTitle}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.settings.exportSubtitle}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PrimaryButton onClick={handleExportJson} disabled={busy !== null}>
              {busy === "json" ? t.settingsPage.exporting : t.settingsPage.exportJson}
            </PrimaryButton>
            <SecondaryButton onClick={handleExportCsv} disabled={busy !== null}>
              {busy === "csv" ? t.settingsPage.exporting : t.settingsPage.exportCsv}
            </SecondaryButton>
            <SecondaryButton onClick={handleExportPhotos} disabled={busy !== null}>
              {busy === "photos" ? t.settingsPage.exporting : t.settingsPage.exportPhotos}
            </SecondaryButton>
          </div>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.import}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
            {t.settingsPage.importBody}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            disabled={busy !== null}
            style={{ display: "none" }}
          />
          <SecondaryButton onClick={() => fileInputRef.current?.click()} disabled={busy !== null}>
            {busy === "import" ? t.settingsPage.importing : t.settingsPage.chooseJsonFile}
          </SecondaryButton>
        </Card>

        {message && (
          <div style={{ marginBottom: 16 }}>
            <Banner severity="neutral">{message}</Banner>
          </div>
        )}

        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.onboarding}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
            {t.settingsPage.onboardingBody}
          </p>
          <SecondaryButton
            onClick={async () => {
              await saveProfile({ onboardingCompletedAt: null });
              router.push("/onboarding");
            }}
          >
            {t.settings.startOver}
          </SecondaryButton>
        </Card>

        <Card>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.fishCheckIns}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
            {t.settingsPage.fishCheckInsBody}
          </p>
          {survivalPromptOff ? (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{t.settingsPage.turnedOff}</p>
          ) : (
            <SecondaryButton
              onClick={async () => {
                await disableSurvivalPromptForever();
                setSurvivalPromptOff(true);
              }}
            >
              {t.settingsPage.turnOffCheckIns}
            </SecondaryButton>
          )}
        </Card>
      </details>
    </Screen>
  );
}
