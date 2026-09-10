"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Screen } from "@/components/Screen";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { APP_NAME } from "@/constants/app";
import { AquaIcon } from "@/components/icons/AquaIcon";

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
    <Screen>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40, marginBottom: 24 }}>
        <AquaIcon name="tanks" size={40} />
        <h1 style={{ fontSize: "var(--font-title-size)", marginTop: 12 }}>{APP_NAME}</h1>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginTop: 4 }}>Sign in to continue</p>
      </div>

      <SecondaryButton onClick={handleGoogle} style={{ marginBottom: 20 }}>
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
    </Screen>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Screen>Loading...</Screen>}>
      <LoginForm />
    </Suspense>
  );
}
