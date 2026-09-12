"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { APP_NAME } from "@/constants/app";
import { AquaIcon } from "@/components/icons/AquaIcon";

/** The standard four-colour Google "G" mark — Google's brand guidelines require the real logo (not a generic icon) on a "Continue/Sign in with Google" button. */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.69 9c0-.6.1-1.18.28-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/**
 * Real accounts, added 2026-09-10 (Jaideep: "launch it to real users").
 * Two sign-in paths — Google OAuth, or a phone number + a self-chosen
 * 4-digit PIN (no SMS OTP, per Jaideep's explicit call to skip that cost).
 * The phone+PIN form doubles as sign-up: the server auto-registers a phone
 * number the first time it's seen (src/auth.ts) — there's no separate
 * "create account" screen, just a confirm-PIN step here so a typo at
 * signup doesn't lock someone out of the account they just created.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    await signIn("google", { callbackUrl: from });
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{10,15}$/.test(phone.trim())) {
      setError("Enter a valid phone number (digits only).");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("Your PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match — if this is a new number, type the same 4 digits in both boxes.");
      return;
    }
    setBusy(true);
    const result = await signIn("credentials", { phone: phone.trim(), pin, redirect: false });
    setBusy(false);
    if (result?.error) {
      setError(result.error === "CredentialsSignin" ? "Incorrect PIN, or too many attempts — try again shortly." : result.error);
      return;
    }
    router.push(from);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        boxSizing: "border-box",
        // Jaideep's reference image (a moonlit lake scene) as the sign-in
        // backdrop, matching the onboarding welcome screen's treatment.
        background: "#0b1620 url(/login-bg.jpg) center / cover no-repeat",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <AquaIcon name="tanks" size={40} />
        <h1 style={{ fontSize: "var(--font-title-size)", marginTop: 12, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>{APP_NAME}</h1>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "var(--font-body-sm-size)", marginTop: 4, textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>
          Sign in to continue
        </p>
      </div>

      {/* A frosted card holds the actual controls so Field/Button/Banner
          keep their normal light-surface contrast instead of sitting
          directly on a busy photo. */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--color-surface, var(--color-ground))",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          boxShadow: "var(--shadow-lift, 0 12px 40px rgba(0,0,0,0.35))",
        }}
      >
        <SecondaryButton onClick={handleGoogle} style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <GoogleLogo />
          Continue with Google
        </SecondaryButton>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 20px", color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
          <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
        </div>

        <form onSubmit={handlePhoneSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Phone number" type="tel" inputMode="numeric" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field label="4-digit PIN" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <Field
            label="Confirm PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
            New number? This creates your account. Already have one? Just enter your existing PIN in both boxes.
          </p>
          {error && <Banner severity="fixNow">{error}</Banner>}
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Checking..." : "Continue"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0b1620" }} />}>
      <LoginForm />
    </Suspense>
  );
}
