"use client";

import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "./Button";
import { hasSeenFirstTankTour, markFirstTankTourShown } from "@/db/queries/settings";

const CARDS = [
  { icon: "📈", title: "Log parameters", body: "Track ammonia, pH and more with graphs and per-tank target ranges — open any tank's Measure tab." },
  { icon: "📓", title: "Journal", body: "Every scan, check and treatment builds its own timeline automatically — open any tank's Journal tab to see it." },
  { icon: "💬", title: "Ask AquaAI", body: "Got a question about your tank? Ask anything — the answer already knows your setup." },
];

/**
 * "After the first tank exists, a short 'here's what this app does'
 * moment — three cards, skippable" (specs/T-023). Shows once, on the
 * Tanks list, the first time it renders with at least one tank.
 */
export function FirstTankTour({ hasTanks }: { hasTanks: boolean }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasTanks) return;
    hasSeenFirstTankTour().then((seen) => {
      if (!seen) setVisible(true);
    });
  }, [hasTanks]);

  async function dismiss() {
    setVisible(false);
    await markFirstTankTourShown();
  }

  if (!visible) return null;
  const card = CARDS[step];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={dismiss}
    >
      <div
        style={{ background: "var(--color-surface)", borderRadius: 16, padding: 24, maxWidth: 320, width: "100%", textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: 40, display: "block", marginBottom: 12 }} aria-hidden>
          {card.icon}
        </span>
        <p style={{ fontWeight: 700, fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{card.title}</p>
        <p style={{ color: "var(--color-ink-muted)", marginBottom: 20 }}>{card.body}</p>

        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 16 }}>
          {CARDS.map((_, i) => (
            <span
              key={i}
              style={{ width: 6, height: 6, borderRadius: "50%", background: i === step ? "var(--color-deep)" : "var(--color-line)" }}
            />
          ))}
        </div>

        {step < CARDS.length - 1 ? (
          <div style={{ display: "flex", gap: 8 }}>
            <SecondaryButton onClick={dismiss}>Skip</SecondaryButton>
            <PrimaryButton onClick={() => setStep((s) => s + 1)}>Next</PrimaryButton>
          </div>
        ) : (
          <PrimaryButton onClick={dismiss}>Got it</PrimaryButton>
        )}
      </div>
    </div>
  );
}
