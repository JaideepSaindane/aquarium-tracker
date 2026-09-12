"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { BackHeader } from "@/components/BackHeader";
import { useLiveQuery } from "@/db/live";
import { listTanks } from "@/db/queries/tanks";
import { listAiInteractions, rateAiInteraction } from "@/db/queries/ai-interactions";
import { useTranslation } from "@/i18n/use-translation";
import { Turn, type AiInteractionRow } from "../page";

/**
 * Every past Ask AquaAI question, across every visit — reachable from the
 * main Ask screen's "History" link (2026-09-12). The main screen itself no
 * longer loads this on every visit (Jaideep: "the second conversation has
 * history in the same chat, so it gets messy") — this is the one place
 * that still shows the full all-time record, filterable by tank, newest
 * first. Reuses the exact same `Turn` renderer as the live chat so a past
 * answer looks and behaves identically (rate it, ask for detail, tap a
 * grounding link) — this is a real, live-editable view, not a read-only
 * archive.
 */
export default function AskHistoryPage() {
  const router = useRouter();
  const t = useTranslation();
  const { data: tanks } = useLiveQuery(listTanks, []);
  const { data: history } = useLiveQuery(listAiInteractions, []);
  const [tankFilter, setTankFilter] = useState("");
  const [showDetailIds, setShowDetailIds] = useState<Set<string>>(new Set());
  const [showCorrectionIds, setShowCorrectionIds] = useState<Set<string>>(new Set());
  const [correctionText, setCorrectionText] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const rows: AiInteractionRow[] = (history ?? [])
    .filter((h) => h.kind === "ask" && (!tankFilter || h.tankId === tankFilter))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((h) => (h.id in ratings ? { ...h, rating: ratings[h.id] } : h));

  async function handleRate(id: string, rating: 1 | -1) {
    await rateAiInteraction(id, rating);
    setRatings((r) => ({ ...r, [id]: rating }));
    if (rating === -1) setShowCorrectionIds((s) => new Set(s).add(id));
  }

  async function handleSaveCorrection(id: string) {
    await rateAiInteraction(id, -1, correctionText[id]?.trim() || undefined);
    setShowCorrectionIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  return (
    <Screen>
      <BackHeader title={t.askHistoryPage.title} fallbackHref="/ask" />

      <select
        value={tankFilter}
        onChange={(e) => setTankFilter(e.target.value)}
        aria-label={t.askPage.aboutWhichTank}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-line)",
          background: "var(--color-surface)",
          color: "var(--color-ink)",
          marginBottom: 16,
        }}
      >
        <option value="">{t.askHistoryPage.filterAllTanks}</option>
        {(tanks ?? []).map((tk) => (
          <option key={tk.id} value={tk.id}>
            {tk.name}
          </option>
        ))}
      </select>

      {rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{t.askHistoryPage.emptyTitle}</p>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{t.askHistoryPage.emptyBody}</p>
        </div>
      )}

      {rows.map((row) => (
        <Turn
          key={row.id}
          row={row}
          showDetail={showDetailIds.has(row.id)}
          onShowDetail={() => setShowDetailIds((s) => new Set(s).add(row.id))}
          showCorrection={showCorrectionIds.has(row.id)}
          correctionText={correctionText[row.id] ?? ""}
          onCorrectionChange={(v) => setCorrectionText((m) => ({ ...m, [row.id]: v }))}
          onSaveCorrection={() => handleSaveCorrection(row.id)}
          onRate={(r) => handleRate(row.id, r)}
          onAction={() => {}}
          onOpenRef={(type, id) => (type === "species" ? router.push(`/dex/${id}`) : type === "corpus" ? router.push(`/corpus/${id}`) : undefined)}
        />
      ))}
    </Screen>
  );
}
