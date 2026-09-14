"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { submitFeedback, type FeedbackSource } from "@/db/queries/feedback";
import { useTranslation } from "@/i18n/use-translation";

/**
 * One shared feedback form, opened from three places (2026-09-14, Jaideep:
 * "Add a mechanism for users to share feedback with us... on the homepage,
 * within Aqua AI chat, [and] in the settings"): Home's header, Ask's
 * header, and a "Give feedback" row in Settings. `source` just tags which
 * one, so the hidden /dev/feedback viewer can show where it came from.
 * There's no email delivery (nothing in the stack sends email today) —
 * this lands in Postgres and is only ever read back through the same
 * admin-allowlist gate as /dev/community-reports, which already defaults
 * to Jaideep's own account.
 */
export function FeedbackModal({ source, onClose }: { source: FeedbackSource; onClose: () => void }) {
  const t = useTranslation();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await submitFeedback({ source, body: body.trim() });
      setSent(true);
      setTimeout(onClose, 1200);
    } catch {
      setError(t.feedback.couldNotSend);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.feedback.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.5)",
        padding: 24,
      }}
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          padding: 20,
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}
      >
        <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 6, color: "var(--color-ink)" }}>{t.feedback.title}</p>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 12 }}>{t.feedback.prompt}</p>

        {sent ? (
          <Banner severity="improve">{t.feedback.sent}</Banner>
        ) : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.feedback.placeholder}
              rows={5}
              autoFocus
              style={{
                width: "100%",
                padding: 12,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-line)",
                background: "var(--color-surface-alt)",
                color: "var(--color-ink)",
                fontSize: "var(--font-body-size)",
                fontFamily: "inherit",
                boxSizing: "border-box",
                resize: "vertical",
                marginBottom: 12,
              }}
            />
            {error && (
              <div style={{ marginBottom: 12 }}>
                <Banner severity="watch">{error}</Banner>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryButton onClick={onClose} disabled={busy}>
                {t.common.cancel}
              </SecondaryButton>
              <PrimaryButton onClick={handleSend} disabled={busy || !body.trim()}>
                {busy ? t.feedback.sending : t.feedback.send}
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
