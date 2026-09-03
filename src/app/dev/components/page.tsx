"use client";

import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { SeverityCard } from "@/components/SeverityCard";
import { Chip } from "@/components/Chip";
import { Field } from "@/components/Field";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";
import { Confidence } from "@/components/Confidence";
import { GroundingLink } from "@/components/GroundingLink";

// T-010 acceptance criterion 3: every shared component, in both themes, for
// eyeballing. Not linked from the app nav — visit /dev/components directly.
export default function ComponentsDevPage() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [dismissed, setDismissed] = useState(false);

  return (
    <div
      data-theme={theme === "system" ? undefined : theme}
      style={{ minHeight: "100dvh", background: "var(--color-ground)" }}
    >
      <Screen>
        <h1 style={{ fontSize: "var(--font-title-size)" }}>Component gallery</h1>
        <div style={{ display: "flex", gap: 8, margin: "12px 0 24px" }}>
          <SecondaryButton onClick={() => setTheme("system")}>System</SecondaryButton>
          <SecondaryButton onClick={() => setTheme("light")}>Light</SecondaryButton>
          <SecondaryButton onClick={() => setTheme("dark")}>Dark</SecondaryButton>
        </div>

        <Section title="Card">
          <Card>Plain card content.</Card>
        </Section>

        <Section title="SeverityCard">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SeverityCard severity="fixNow" title="No heater visible">
              Bangalore drops to ~19C in winter — worth checking if this tank needs one.
            </SeverityCard>
            <SeverityCard severity="watch" title="Slightly low planting">
              A bit more cover would help shy fish settle in.
            </SeverityCard>
            <SeverityCard severity="improve" title="Consider a background">
              Purely cosmetic, no urgency.
            </SeverityCard>
          </div>
        </Section>

        <Section title="Chip">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip variant="neutral">Neutral</Chip>
            <Chip variant="fixNow">Fix now</Chip>
            <Chip variant="watch">Watch</Chip>
            <Chip variant="improve">Improve</Chip>
            <Chip variant="unverified">Unverified</Chip>
            <Chip variant="pro">Pro</Chip>
          </div>
        </Section>

        <Section title="Field">
          <Field label="Tank length (cm)" placeholder="60" />
          <div style={{ height: 8 }} />
          <Field label="City" error="This field is required" />
        </Section>

        <Section title="Buttons">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PrimaryButton>Primary action</PrimaryButton>
            <SecondaryButton>Secondary action</SecondaryButton>
            <DangerButton>Delete tank</DangerButton>
          </div>
        </Section>

        <Section title="Banner">
          {!dismissed && (
            <Banner severity="watch" onDismiss={() => setDismissed(true)}>
              Your tank is 12 days old — this is normal at this stage.
            </Banner>
          )}
          {dismissed && <SecondaryButton onClick={() => setDismissed(false)}>Reset banner</SecondaryButton>}
        </Section>

        <Section title="EmptyState">
          <EmptyState icon="🐟" message="No tanks yet. Scan a tank to get started." actionLabel="Scan a tank" onAction={() => {}} />
        </Section>

        <Section title="Confidence">
          <div style={{ display: "flex", gap: 12 }}>
            <Confidence value={0.92} />
            <Confidence value={0.6} />
            <Confidence value={0.3} />
          </div>
        </Section>

        <Section title="GroundingLink">
          <GroundingLink label="Neon tetra" onOpen={() => {}} />
        </Section>
      </Screen>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: "var(--font-heading-size)", marginBottom: 8 }}>{title}</h2>
      {children}
    </div>
  );
}
