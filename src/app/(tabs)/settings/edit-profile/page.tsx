"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { TankAvatar } from "@/components/TankAvatar";
import { getProfile, saveProfile } from "@/db/queries/profile";
import { uploadPhoto } from "@/lib/photo-upload";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Redesign Section 9 ("a conventional, scannable settings architecture"):
 * the editable profile fields (name/username/city/email/contact/photo)
 * used to sit inline on the main Settings screen, always visible whether
 * or not anyone was about to edit them. They now live here, one level
 * down, reached via the "Edit profile ›" row on that screen — the same
 * split most apps use between "here's who you are" (Profile) and "change
 * who you are" (Edit profile).
 */
export default function EditProfilePage() {
  const router = useRouter();
  const t = useTranslation();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getProfile().then((p) => {
      if (!p) return;
      setName(p.name ?? "");
      setUsername(p.username ?? "");
      setCity(p.city ?? "");
      setEmail(p.email ?? "");
      setContact(p.contact ?? "");
      setPhotoUri(p.photoUri ?? null);
    });
  }, []);

  async function handlePhoto(file: File) {
    setMessage(null);
    try {
      const url = await uploadPhoto(file);
      setPhotoUri(url);
    } catch {
      setMessage(t.settingsPage.couldNotUploadPhoto);
    }
  }

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    try {
      await saveProfile({
        name: name.trim() || undefined,
        username: username.trim() || undefined,
        city: city.trim() || undefined,
        email: email.trim() || undefined,
        contact: contact.trim() || undefined,
        photoUri: photoUri ?? undefined,
      });
      router.back();
    } catch (err) {
      setMessage(`${t.settingsPage.couldNotSave} ${String(err)}`);
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackHeader title={t.settingsPage.editProfile} fallbackHref="/settings" />

      <Card>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <TankAvatar photoUri={photoUri} size={88} onPhotoChange={handlePhoto} fallbackIcon="👤" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Field label={t.settingsPage.name} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.settingsPage.optional} />
          <Field label={t.settingsPage.username} value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.settingsPage.optional} />
          <Field label={t.settingsPage.city} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.settingsPage.optional} />
          <Field label={t.settingsPage.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.settingsPage.optional} />
          <Field label={t.settingsPage.contact} type="tel" value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t.settingsPage.optional} />
          <PrimaryButton onClick={handleSave} disabled={busy}>
            {busy ? t.settingsPage.saving : t.common.save}
          </PrimaryButton>
        </div>
        {message && (
          <div style={{ marginTop: 12 }}>
            <Banner severity="neutral">{message}</Banner>
          </div>
        )}
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 8 }}>{t.settings.profileSubtitle}</p>
      </Card>
    </Screen>
  );
}
