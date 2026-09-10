"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { TankAvatar } from "@/components/TankAvatar";
import { APP_NAME } from "@/constants/app";
import { ensureDb } from "@/db/client";
import { buildJsonExport, buildCsvZip, buildPhotosZip, downloadBlob, canShareFiles, shareFile } from "@/lib/export";
import { importJsonExport } from "@/lib/import";
import { getProfile, saveProfile } from "@/db/queries/profile";
import { resetOnboarding, isSurvivalPromptDisabled, disableSurvivalPromptForever } from "@/db/queries/settings";
import { writePhotoFile } from "@/lib/opfs-files";
import { newId } from "@/db/id";
import { useTranslation } from "@/i18n/use-translation";
import { useLocale } from "@/i18n/use-locale";
import { useTheme, type ThemeChoice } from "@/theme/ThemeProvider";
import type { Locale } from "@/i18n/types";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslation();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shareSupported, setShareSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    ensureDb();
    canShareFiles().then(setShareSupported);
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
  }, []);

  async function handleProfilePhoto(file: File) {
    const path = `profile/${newId()}.jpg`;
    await writePhotoFile(path, file);
    setProfilePhotoUri(path);
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
      setProfileMessage("Saved.");
    } catch (err) {
      setProfileMessage(`Couldn't save: ${String(err)}`);
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
      setShareMessage("Link copied to clipboard.");
    } catch {
      setShareMessage(url);
    }
  }

  async function withBusy(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage(`Something went wrong: ${String(err)}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleExportJson() {
    await withBusy("json", async () => {
      const data = await buildJsonExport();
      const bytes = JSON.stringify(data, null, 2);
      const filename = `${APP_NAME.toLowerCase()}-export-${timestamp()}.json`;
      if (shareSupported && (await shareFile(bytes, filename, "application/json"))) {
        setMessage("Shared the JSON export.");
      } else {
        downloadBlob(bytes, filename, "application/json");
        setMessage("Downloaded the JSON export.");
      }
    });
  }

  async function handleExportCsv() {
    await withBusy("csv", async () => {
      const zip = await buildCsvZip();
      const filename = `${APP_NAME.toLowerCase()}-tables-${timestamp()}.zip`;
      if (shareSupported && (await shareFile(zip, filename, "application/zip"))) {
        setMessage("Shared the CSV export.");
      } else {
        downloadBlob(zip, filename, "application/zip");
        setMessage("Downloaded the CSV export.");
      }
    });
  }

  async function handleExportPhotos() {
    await withBusy("photos", async () => {
      const zip = await buildPhotosZip();
      const filename = `${APP_NAME.toLowerCase()}-photos-${timestamp()}.zip`;
      if (shareSupported && (await shareFile(zip, filename, "application/zip"))) {
        setMessage("Shared the photo export.");
      } else {
        downloadBlob(zip, filename, "application/zip");
        setMessage("Downloaded the photo export.");
      }
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
        setMessage(`Import complete — processed ${total} rows across ${Object.keys(result.attempted).length} tables.`);
      } else {
        setMessage(`Import failed: ${result.error}`);
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
          <Field label="Name" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Optional" />
          <Field label="Username" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value)} placeholder="Optional" />
          <Field label="City" value={profileCity} onChange={(e) => setProfileCity(e.target.value)} placeholder="Optional" />
          <Field label="Email" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="Optional" />
          <Field label="Contact" type="tel" value={profileContact} onChange={(e) => setProfileContact(e.target.value)} placeholder="Optional" />
          <PrimaryButton onClick={handleSaveProfile} disabled={profileBusy}>
            {profileBusy ? "Saving..." : "Save"}
          </PrimaryButton>
        </div>
        {profileMessage && (
          <div style={{ marginTop: 12 }}>
            <Banner severity="neutral">{profileMessage}</Banner>
          </div>
        )}
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 8 }}>{t.settings.profileSubtitle}</p>
      </Card>

      {/* App settings */}
      <Card style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>App settings</h2>

        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "12px 0 6px" }}>{t.settings.languageTitle}</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["en", "hi-latn"] as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-line)",
                background: locale === l ? "var(--color-deep)" : "transparent",
                color: locale === l ? "#fff" : "var(--color-ink)",
                fontWeight: 600,
                fontSize: "var(--font-caption-size)",
              }}
            >
              {l === "en" ? "English" : "Hinglish"}
            </button>
          ))}
        </div>

        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "0 0 6px" }}>Appearance</p>
        <div style={{ display: "flex", gap: 8 }}>
          {(["system", "light", "dark"] as ThemeChoice[]).map((th) => (
            <button
              key={th}
              type="button"
              onClick={() => setTheme(th)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-line)",
                background: theme === th ? "var(--color-deep)" : "transparent",
                color: theme === th ? "#fff" : "var(--color-ink)",
                fontWeight: 600,
                fontSize: "var(--font-caption-size)",
                textTransform: "capitalize",
              }}
            >
              {th}
            </button>
          ))}
        </div>
      </Card>

      {/* Your plan */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)" }}>Your plan</h2>
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
            🐦 Early Bird
          </span>
        </div>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
          Pro isn&apos;t built yet, so everything is unlocked and free for everyone right now — no card needed, nothing to
          cancel.
        </p>
        <details>
          <summary style={{ cursor: "pointer", color: "var(--color-deep)", fontWeight: 600, fontSize: "var(--font-body-sm-size)" }}>
            What happens when Pro launches?
          </summary>
          <div style={{ marginTop: 8, color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.6 }}>
            <p style={{ marginBottom: 8 }}>
              Species care data, disease reference, emergency triage, all 8 standard water parameters, compatibility checks,
              journal, export and the Species Dex stay free forever for everyone — always have, always will.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>
                If you&apos;re using the app before Pro launches, this Early Bird period is honoured for as long as you keep
                using the app
              </strong>{" "}
              — that&apos;s the deal for being here early, in writing.
            </p>
            <p>
              And if development on this app ever stops for good, everything unlocks for everyone and your data stays fully
              exportable — that commitment doesn&apos;t depend on Pro existing.
            </p>
          </div>
        </details>
      </Card>

      {/* Share / Privacy / About */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SecondaryButton onClick={handleShareApp}>📤 Share this app</SecondaryButton>
          <Link href="/privacy">
            <SecondaryButton>🔒 Privacy policy</SecondaryButton>
          </Link>
          <Link href="/about">
            <SecondaryButton>ℹ️ About {APP_NAME}</SecondaryButton>
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
          More: export &amp; import your data, restart the tour
        </summary>

        <div style={{ height: 8 }} />

        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settings.exportTitle}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.settings.exportSubtitle}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PrimaryButton onClick={handleExportJson} disabled={busy !== null}>
              {busy === "json" ? "Exporting..." : "Export everything (JSON)"}
            </PrimaryButton>
            <SecondaryButton onClick={handleExportCsv} disabled={busy !== null}>
              {busy === "csv" ? "Exporting..." : "Export as spreadsheets (CSV zip)"}
            </SecondaryButton>
            <SecondaryButton onClick={handleExportPhotos} disabled={busy !== null}>
              {busy === "photos" ? "Exporting..." : "Export photos (zip)"}
            </SecondaryButton>
          </div>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>Import</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
            Restore from a JSON export. Safe to run more than once — it will not create duplicates.
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
            {busy === "import" ? "Importing..." : "Choose a JSON export file..."}
          </SecondaryButton>
        </Card>

        {message && (
          <div style={{ marginBottom: 16 }}>
            <Banner severity="neutral">{message}</Banner>
          </div>
        )}

        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>Onboarding</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
            Replays the &quot;what brings you here?&quot; screen. Doesn&apos;t touch your tanks or any other data.
          </p>
          <SecondaryButton
            onClick={async () => {
              await resetOnboarding();
              router.push("/onboarding");
            }}
          >
            {t.settings.startOver}
          </SecondaryButton>
        </Card>

        <Card>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>Fish check-ins</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>
            Every few weeks, we ask &quot;still doing well?&quot; about fish added over 90 days ago — just so your records
            stay accurate. No scores, no streaks.
          </p>
          {survivalPromptOff ? (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>Turned off. You won&apos;t be asked again.</p>
          ) : (
            <SecondaryButton
              onClick={async () => {
                await disableSurvivalPromptForever();
                setSurvivalPromptOff(true);
              }}
            >
              Turn off check-ins
            </SecondaryButton>
          )}
        </Card>
      </details>
    </Screen>
  );
}
