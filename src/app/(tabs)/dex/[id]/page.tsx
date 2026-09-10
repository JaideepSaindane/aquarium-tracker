"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Chip } from "@/components/Chip";
import { useLiveQuery } from "@/db/live";
import { getSpecies } from "@/db/queries/species";
import { getDexCard, unlockDexCard } from "@/db/queries/dex";
import { listTanks } from "@/db/queries/tanks";
import { addLivestock, listAllAliveLivestock } from "@/db/queries/livestock";
import { APP_NAME } from "@/constants/app";
import { isAiGenerated } from "@/lib/species-origin";

// Placeholder until there's a real install/landing page to link to.
const APP_DOWNLOAD_LINK = "https://aquaai-web.vercel.app";

const CATEGORY_ICON: Record<string, string> = {
  fish: "🐟",
  shrimp: "🦐",
  snail: "🐌",
  crayfish: "🦞",
  plant: "🌿",
};

const DIFFICULTY_CHIP: Record<string, { label: string; color: string }> = {
  beginner: { label: "Easy", color: "var(--color-improve)" },
  intermediate: { label: "Moderate", color: "var(--color-watch)" },
  advanced: { label: "Advanced", color: "var(--color-fix-now)" },
};

function parseArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function range(min?: number | null, max?: number | null, unit = ""): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}–${max}${unit}`;
  return `${min ?? max}${unit}`;
}

// dGH buckets are the standard hobbyist convention (soft < 6, moderate 6-12,
// hard > 12). Classifies both ends of the range so a species spanning
// buckets (e.g. 4-10 dGH) reads as "Soft–Moderate" rather than one label.
function hardnessLabel(min?: number | null, max?: number | null): string | null {
  if (min == null && max == null) return null;
  const lo = min ?? max!;
  const hi = max ?? min!;
  const bucket = (dgh: number) => (dgh < 6 ? "Soft" : dgh <= 12 ? "Moderate" : "Hard");
  const loLabel = bucket(lo);
  const hiLabel = bucket(hi);
  return loLabel === hiLabel ? loLabel : `${loLabel}–${hiLabel}`;
}

function tankSizeLabel(species: { minFootprintLengthCm?: number | null; minFootprintWidthCm?: number | null; minVolumeL?: number | null }): string | null {
  const { minFootprintLengthCm: l, minFootprintWidthCm: w, minVolumeL } = species;
  if (l != null && w != null) return `${l}cm long, ${w}cm wide`;
  if (l != null) return `${l}cm long`;
  if (w != null) return `${w}cm wide`;
  if (minVolumeL != null) return `${minVolumeL}L minimum`;
  return null;
}

function speakName(name: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(name);
  window.speechSynthesis.speak(utterance);
}

// Restyled 2026-09-02 to match a reference screenshot Jaideep shared —
// large hero photo, a "Care Overview" icon-stat grid and a "Care Tips" box,
// in the scoped "soft" blue palette (tokens.css --soft-*).
function StatTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "14px 8px",
        borderRadius: "var(--radius-md)",
        background: "var(--soft-bg-alt)",
      }}
    >
      <span style={{ fontSize: 20 }} aria-hidden>
        {icon}
      </span>
      <span style={{ fontWeight: 700, color: "var(--soft-ink)", fontSize: "var(--font-body-sm-size)" }}>{value}</span>
      <span style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)" }}>{label}</span>
    </div>
  );
}

export default function DexDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: species } = useLiveQuery(() => getSpecies(id), [id]);
  const { data: card } = useLiveQuery(() => getDexCard(id), [id]);
  const { data: tanks } = useLiveQuery(() => listTanks(), []);
  const { data: aliveLivestock } = useLiveQuery(() => listAllAliveLivestock(), []);
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [showTankPicker, setShowTankPicker] = useState(false);
  const [addingToTankId, setAddingToTankId] = useState<string | null>(null);

  if (!species) return <Screen background="var(--soft-bg)">Loading...</Screen>;

  const unlocked = !!card;
  const commonNames = parseArray(species.commonNames);
  const name = commonNames[0] ?? species.id;
  const icon = CATEGORY_ICON[species.category ?? ""] ?? "❓";
  const keptSince = card?.unlockedAt ? new Date(card.unlockedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null;

  const temp = range(species.tempCMin, species.tempCMax, "°C");
  const hardness = hardnessLabel(species.hardnessDghMin, species.hardnessDghMax);
  const tankSize = tankSizeLabel(species);
  const mistakes = parseArray(species.commonMistakes);
  const statusChip = species.difficulty ? DIFFICULTY_CHIP[species.difficulty] : null;
  const visibleTanks = (tanks ?? []).filter((t) => t.status !== "archived");
  const tankById = new Map(visibleTanks.map((t) => [t.id, t]));
  const keptIn = (aliveLivestock ?? [])
    .filter((l) => l.speciesId === id && tankById.has(l.tankId))
    .map((l) => ({ tank: tankById.get(l.tankId)!, count: l.count }));

  async function handleAddToTank(tankId: string) {
    setAddingToTankId(tankId);
    try {
      await addLivestock({ tankId, speciesId: id, count: 1 });
      await unlockDexCard({ speciesId: id, unlockSource: "added_to_tank" });
      setShowTankPicker(false);
    } finally {
      setAddingToTankId(null);
    }
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const cardCanvas = await html2canvas(cardRef.current, { backgroundColor: "#0b1f3a", scale: 2 });

      const footerHeight = 64;
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = cardCanvas.width;
      finalCanvas.height = cardCanvas.height + footerHeight * 2;
      const ctx = finalCanvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0b1f3a";
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      ctx.drawImage(cardCanvas, 0, 0);

      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(`Try ${APP_NAME}`, finalCanvas.width / 2, cardCanvas.height + footerHeight);
      ctx.font = "22px sans-serif";
      ctx.fillStyle = "#a9c4c6";
      ctx.fillText(APP_DOWNLOAD_LINK, finalCanvas.width / 2, cardCanvas.height + footerHeight + 36);

      finalCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${species!.id}-dex-card.png`, { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; text?: string; url?: string }) => Promise<void> };
        if (nav.canShare?.({ files: [file] }) && nav.share) {
          try {
            await nav.share({ files: [file], text: `Check out ${name} on ${APP_NAME}`, url: APP_DOWNLOAD_LINK });
            return;
          } catch {
            // user cancelled — fall through to download
          }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, "image/png");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Screen background="var(--soft-bg)">
      <button
        onClick={() => router.back()}
        aria-label="Back"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid var(--soft-card-border)",
          background: "var(--soft-card-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          fontSize: 18,
          marginBottom: 16,
          color: "var(--soft-ink)",
        }}
      >
        ←
      </button>

      <div ref={cardRef} style={{ background: "var(--soft-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <h1 style={{ fontSize: "var(--font-title-size)", color: "var(--soft-ink)" }}>{name}</h1>
        <button
          onClick={() => speakName(name)}
          aria-label={`Hear "${name}" pronounced`}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid var(--soft-card-border)",
            background: "var(--soft-card-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          🔊
        </button>
      </div>
      <p style={{ color: "var(--soft-ink-muted)", fontStyle: "italic", marginBottom: 8 }}>{species.scientificName}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {statusChip && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "var(--font-caption-size)",
              fontWeight: 700,
              padding: "3px 12px",
              borderRadius: "var(--radius-pill)",
              color: statusChip.color,
              background: "var(--soft-bg-alt)",
            }}
          >
            ● {statusChip.label}
          </span>
        )}
        {isAiGenerated(species) && <Chip variant="unverified">AI-generated — provisional</Chip>}
        {!unlocked && <Chip variant="neutral">Locked — add to a tank to unlock</Chip>}
      </div>

      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          maxHeight: 280,
          borderRadius: "var(--radius-xl)",
          background: "var(--soft-card-bg)",
          border: "1px solid var(--soft-card-border)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginBottom: 16,
          filter: unlocked ? "none" : "grayscale(100%)",
        }}
      >
        {unlocked && species.imageUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={species.imageUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 72 }} aria-hidden>
            {icon}
          </span>
        )}
      </div>

      {keptSince && <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: -8, marginBottom: 16 }}>Kept since {keptSince}</p>}

      {isAiGenerated(species) && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: "var(--radius-md)",
            background: "var(--soft-bg-alt)",
            borderLeft: "3px solid var(--color-watch)",
          }}
        >
          <p style={{ fontSize: "var(--font-body-sm-size)", color: "var(--soft-ink)" }}>
            This card was generated by AI, not yet reviewed by a human. {species.uncertaintyNote || "Treat the details as a starting point, not gospel."}
          </p>
        </div>
      )}

      <div
        style={{
          padding: 16,
          borderRadius: "var(--radius-lg)",
          background: "var(--soft-card-bg)",
          border: "1px solid var(--soft-card-border)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          marginBottom: 16,
        }}
      >
        <p style={{ fontWeight: 700, color: "var(--soft-ink)", marginBottom: 10 }}>Care Overview</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          <StatTile icon="🌡️" label="Temp" value={temp ?? "—"} />
          <StatTile icon="💧" label="Water" value={hardness ?? "—"} />
          <StatTile icon="📏" label="Min. tank" value={species.minVolumeL ? `${species.minVolumeL}L` : "—"} />
          <StatTile icon="👥" label="Group" value={species.socialMinGroup ? `${species.socialMinGroup}+` : "—"} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: "var(--font-body-sm-size)" }}>
          {tankSize && (
            <div>
              <div style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)" }}>Minimum tank size</div>
              <div style={{ color: "var(--soft-ink)" }}>{tankSize}</div>
            </div>
          )}
          {species.temperament && (
            <div>
              <div style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)" }}>Temperament</div>
              <div style={{ color: "var(--soft-ink)", textTransform: "capitalize" }}>{species.temperament}</div>
            </div>
          )}
          {species.diet && (
            <div>
              <div style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)" }}>Diet</div>
              <div style={{ color: "var(--soft-ink)", textTransform: "capitalize" }}>{species.diet}</div>
            </div>
          )}
          {species.adultSizeCm && (
            <div>
              <div style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)" }}>Adult size</div>
              <div style={{ color: "var(--soft-ink)" }}>{species.adultSizeCm}cm</div>
            </div>
          )}
        </div>
        {species.disputed && (
          <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", lineHeight: 1.5, marginTop: 12 }}>{species.disputed}</p>
        )}
      </div>

      {species.careNotes && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "var(--soft-card-bg)",
            border: "1px solid var(--soft-card-border)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            marginBottom: 16,
            display: "flex",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }} aria-hidden>
            💡
          </span>
          <div>
            <p style={{ fontWeight: 700, color: "var(--soft-ink)", marginBottom: 4 }}>Care Tips</p>
            <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>{species.careNotes}</p>
          </div>
        </div>
      )}

      {mistakes.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "var(--soft-card-bg)",
            border: "1px solid var(--soft-card-border)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            marginBottom: 16,
          }}
        >
          <p style={{ fontWeight: 700, color: "var(--soft-ink)", marginBottom: 8 }}>Common mistakes</p>
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--soft-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
            {mistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      </div>

      {keptIn.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "var(--soft-card-bg)",
            border: "1px solid var(--soft-card-border)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            marginBottom: 16,
          }}
        >
          <p style={{ fontWeight: 700, color: "var(--soft-ink)", marginBottom: 8 }}>Currently in your tanks</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {keptIn.map(({ tank, count }) => (
              <div
                key={tank.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "var(--font-body-sm-size)",
                }}
              >
                <span style={{ color: "var(--soft-ink)" }}>{tank.name}</span>
                <span style={{ color: "var(--soft-ink-muted)" }}>× {count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => setShowTankPicker(true)}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: "var(--soft-accent)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "var(--font-body-size)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          Add to tank
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--soft-card-border)",
            background: "var(--soft-card-bg)",
            color: "var(--soft-ink)",
            fontWeight: 700,
            fontSize: "var(--font-body-size)",
            opacity: sharing ? 0.6 : 1,
          }}
        >
          <span aria-hidden>📤</span>
          {sharing ? "Preparing…" : "Share"}
        </button>
      </div>

      {showTankPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add to tank"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.5)",
          }}
          onClick={() => setShowTankPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "70vh",
              overflowY: "auto",
              background: "var(--soft-bg)",
              borderTopLeftRadius: "var(--radius-xl)",
              borderTopRightRadius: "var(--radius-xl)",
              padding: 20,
              boxShadow: "var(--shadow-lg, 0 -8px 30px rgba(0,0,0,0.25))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontWeight: 700, color: "var(--soft-ink)", fontSize: "var(--font-body-size)" }}>Add {name} to a tank</p>
              <button
                onClick={() => setShowTankPicker(false)}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid var(--soft-card-border)",
                  background: "var(--soft-card-bg)",
                  color: "var(--soft-ink)",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {visibleTanks.length === 0 ? (
              <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-body-sm-size)" }}>
                You don&apos;t have any tanks yet — create one first.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {visibleTanks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-lg)",
                      background: "var(--soft-card-bg)",
                      border: "1px solid var(--soft-card-border)",
                    }}
                  >
                    <span style={{ color: "var(--soft-ink)", fontWeight: 600 }}>{t.name}</span>
                    <button
                      onClick={() => handleAddToTank(t.id)}
                      disabled={addingToTankId === t.id}
                      aria-label={`Add ${name} to ${t.name}`}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: "none",
                        background: "var(--soft-accent)",
                        color: "#fff",
                        fontSize: 18,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: addingToTankId === t.id ? 0.6 : 1,
                      }}
                    >
                      {addingToTankId === t.id ? "…" : "+"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Screen>
  );
}
