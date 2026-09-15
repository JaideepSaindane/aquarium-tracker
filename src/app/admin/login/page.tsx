"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Banner } from "@/components/Banner";
import { PrimaryButton } from "@/components/Button";

/**
 * The admin dashboard's own login (2026-09-15, Jaideep: "get the admin
 * page... with an ID and password") — a single fixed ID/password pair
 * (`ADMIN_DASH_PHONE`/`ADMIN_DASH_PIN_HASH` env vars), completely separate
 * from the regular AquaAI account system. Reachable without ever signing
 * into the app itself.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't sign in.");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <div style={{ display: "flex", minHeight: "70vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h1 style={{ fontSize: "var(--font-title-size)", textAlign: "center", marginBottom: 16 }}>Admin Dashboard</h1>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field
                label="ID"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                autoFocus
              />
              <Field
                label="Password"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="6-digit PIN"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              {error && <Banner severity="fixNow">{error}</Banner>}
              <PrimaryButton onClick={handleSubmit} disabled={busy || !phone || !pin}>
                {busy ? "Signing in..." : "Sign in"}
              </PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </Screen>
  );
}
