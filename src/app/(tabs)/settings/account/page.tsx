"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { Card } from "@/components/Card";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { useTranslation } from "@/i18n/use-translation";

/**
 * Redesign Section 9: "Account (Export data, Sign out)." Export data is
 * its own screen (`/settings/export`); this one holds the other
 * account-identity actions that used to sit as always-visible cards on the
 * main Settings screen regardless of whether they applied — adding a
 * backup sign-in method (only shown when one is actually missing) and
 * signing out.
 */
export default function AccountSettingsPage() {
  const t = useTranslation();
  const [hasPhoneLinked, setHasPhoneLinked] = useState<boolean | null>(null); // null = still checking
  const [hasGoogleLinked, setHasGoogleLinked] = useState<boolean | null>(null);
  const [googleLinkError, setGoogleLinkError] = useState<string | null>(null);
  const [linkPhone, setLinkPhone] = useState("");
  const [linkPin, setLinkPin] = useState("");
  const [linkPinConfirm, setLinkPinConfirm] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  useEffect(() => {
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
    const params = new URLSearchParams(window.location.search);
    if (params.get("linkError") === "conflict") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoogleLinkError("That Google account is already linked to a different AquaAI account — sign in with that account directly instead, or use a different Google account.");
      window.history.replaceState(null, "", "/settings/account");
    } else if (params.get("linked") === "google") {
      window.history.replaceState(null, "", "/settings/account");
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

  return (
    <Screen>
      <BackHeader title={t.settingsPage.account} fallbackHref="/settings" />

      {hasPhoneLinked === false && (
        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.addPhoneSignIn}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.settingsPage.addPhoneSignInBody}</p>
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

      {hasGoogleLinked === false && (
        <Card style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 4 }}>{t.settingsPage.linkGoogleAccount}</h2>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.settingsPage.linkGoogleAccountBody}</p>
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

      {hasPhoneLinked && hasGoogleLinked && (
        <Card style={{ marginBottom: 16 }}>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{t.settingsPage.allSetMeta}</p>
        </Card>
      )}

      <Card>
        <DangerButton onClick={() => signOut({ callbackUrl: "/login" })}>{t.settingsPage.signOut}</DangerButton>
      </Card>
    </Screen>
  );
}
