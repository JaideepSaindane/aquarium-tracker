"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { PrimaryButton } from "@/components/Button";
import { APP_NAME, CONTACT_EMAIL } from "@/constants/app";
import { AquaIcon } from "@/components/icons/AquaIcon";
import { IntroAnimation } from "@/components/IntroAnimation";
import { markIntroPlayed } from "@/lib/intro-session";

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

/** Shared full-bleed photo backdrop for every step of this page. */
function Backdrop({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

/** A full-width pill button floating directly on the backdrop photo (frosted glass, no card behind it) — the redesigned first sign-in screen. */
function FloatingPillButton({
  onClick,
  children,
  tone = "light",
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 52,
        padding: "12px 24px",
        borderRadius: "var(--radius-pill)",
        border: tone === "light" ? "1px solid rgba(255,255,255,0.4)" : "none",
        background: tone === "light" ? "rgba(255,255,255,0.16)" : "var(--color-deep)",
        backdropFilter: tone === "light" ? "blur(20px)" : undefined,
        WebkitBackdropFilter: tone === "light" ? "blur(20px)" : undefined,
        color: "#fff",
        fontWeight: 700,
        fontSize: "var(--font-body-size)",
        boxShadow: "var(--shadow-lift)",
      }}
    >
      {children}
    </button>
  );
}

/** Step 1: two floating pills, nothing else — the actual entry point for a signed-out visitor. */
function ChooseMethodStep({ onGoogle, onPhone }: { onGoogle: () => void; onPhone: () => void }) {
  return (
    <Backdrop>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
        <AquaIcon name="tanks" size={40} />
        <h1 style={{ fontSize: "var(--font-title-size)", marginTop: 12, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>{APP_NAME}</h1>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "var(--font-body-sm-size)", marginTop: 4, textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>
          Sign in to continue
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 4 }}>
        <FloatingPillButton onClick={onGoogle}>
          <GoogleLogo />
          Continue with Google
        </FloatingPillButton>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", color: "rgba(255,255,255,0.75)", fontSize: "var(--font-caption-size)" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.3)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.3)" }} />
        </div>

        <FloatingPillButton onClick={onPhone} tone="dark">
          Continue with phone number
        </FloatingPillButton>
      </div>
    </Backdrop>
  );
}

/** Step 2 (phone path only): the same backdrop, a back arrow, and just the three fields. */
function PhoneStep({ onBack, from }: { onBack: () => void; from: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether this number already has an account: switches the password copy
  // between "enter yours" and "set one". An existing number's password is
  // never replaced by what's typed — a wrong one is just rejected.
  const [phoneExists, setPhoneExists] = useState<boolean | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    const digits = phone.trim();
    if (!/^\d{10,15}$/.test(digits)) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch("/api/phone-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: digits }) })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) setPhoneExists(!!data.exists);
        })
        .catch(() => {});
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phone]);

  const knownPhone = /^\d{10,15}$/.test(phone.trim()) ? phoneExists : null;

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
    setBusy(true);
    const result = await signIn("credentials", { phone: phone.trim(), pin, redirect: false });
    setBusy(false);
    if (result?.error) {
      setError(
        result.error === "CredentialsSignin"
          ? knownPhone
            ? "Wrong PIN for this number. Try again, or tap \"Forgot PIN?\". Too many wrong tries locks it for 15 minutes."
            : "Couldn't sign in. Check the number and PIN, or try again in a few minutes."
          : result.error
      );
      return;
    }
    router.replace(from); // replace, so Back never returns to the sign-in page
  }

  return (
    <Backdrop>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        style={{
          position: "fixed",
          top: "calc(20px + env(safe-area-inset-top, 0px))",
          left: 20,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.4)",
          background: "rgba(255,255,255,0.16)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          color: "#fff",
          fontSize: 18,
        }}
      >
        ←
      </button>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <AquaIcon name="tanks" size={40} />
        <h1 style={{ fontSize: "var(--font-title-size)", marginTop: 12, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>{APP_NAME}</h1>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "var(--font-body-sm-size)", marginTop: 4, textShadow: "0 1px 8px rgba(0,0,0,0.45)" }}>
          Sign in with your phone number
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
        <form onSubmit={handlePhoneSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Phone number" type="tel" inputMode="numeric" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Field
            label={knownPhone === true ? "Enter your 4-digit PIN" : knownPhone === false ? "Set a 4-digit PIN" : "Your 4-digit PIN"}
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: -6 }}>
            {knownPhone === true
              ? "This number already has an account. Enter the PIN you set — it can't be changed here."
              : knownPhone === false
                ? "New number. This is not an OTP — no code will be sent. Choose your own 4-digit PIN and remember it."
                : "This is not an OTP — no code will be sent. New here? Set your own 4-digit PIN. Already signed up? Enter the one you set."}
          </p>
          {error && <Banner severity="fixNow">{error}</Banner>}
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Checking..." : "Continue"}
          </PrimaryButton>
          {knownPhone !== false && (
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              style={{ background: "none", border: "none", color: "var(--color-deep)", fontSize: "var(--font-body-sm-size)", fontWeight: 600, padding: 4 }}
            >
              Forgot PIN?
            </button>
          )}
          {showForgot && (
            <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--color-surface-alt)", fontSize: "var(--font-body-sm-size)", lineHeight: 1.5 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>We&apos;ll reset it for you</p>
              <p style={{ margin: "0 0 8px", color: "var(--color-ink-muted)" }}>
                Email us from any account with your phone number and a few details about your tanks, so we can confirm it&apos;s you. We&apos;ll set a new PIN and send it back, usually within a day.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME}: forgot PIN`)}&body=${encodeURIComponent(`Hi, I forgot my ${APP_NAME} PIN.\n\nPhone number: ${phone.trim()}\nMy tanks / fish: \n`)}`}
                style={{ color: "var(--color-deep)", fontWeight: 600 }}
              >
                Email {CONTACT_EMAIL}
              </a>
            </div>
          )}
        </form>
      </div>
    </Backdrop>
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
 *
 * Redesigned 2026-09-13 into three steps (Jaideep): a fish-leap intro
 * plays first for a brand-new signed-out visitor, then two floating pills
 * ("Continue with Google" / "Continue with phone number") replace the old
 * single screen that showed the Google button and all three phone fields
 * at once — the phone path only reveals its three fields after that pill
 * is tapped, on its own step with a back arrow. The intro step calls
 * `markIntroPlayed()` on dismiss (`src/lib/intro-session.ts`) so a fresh
 * sign-up's redirect to `/onboarding` right after doesn't play the exact
 * same animation a second time — Jaideep hit that as a real bug the same
 * day this landed.
 */
function LoginFlow() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";
  const [step, setStep] = useState<"intro" | "choose" | "phone">("intro");

  async function handleGoogle() {
    await signIn("google", { callbackUrl: from });
  }

  if (step === "intro") {
    return (
      <IntroAnimation
        backgroundSrc="/login-bg.jpg"
        onDismiss={() => {
          markIntroPlayed();
          setStep("choose");
        }}
      />
    );
  }

  if (step === "phone") {
    return <PhoneStep onBack={() => setStep("choose")} from={from} />;
  }

  return <ChooseMethodStep onGoogle={handleGoogle} onPhone={() => setStep("phone")} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0b1620" }} />}>
      <LoginFlow />
    </Suspense>
  );
}
