"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Chip } from "@/components/Chip";
import { Banner } from "@/components/Banner";
import { useLiveQuery } from "@/db/live";
import { listSpecies } from "@/db/queries/species";
import { listDexCards } from "@/db/queries/dex";
import { isAiGenerated } from "@/lib/species-origin";
import { identifySpecies } from "@/lib/ai-client";
import { downscaleForUpload } from "@/lib/image-quality/browser";
import { addSpeciesSuggestion, type PhotoCandidate } from "@/db/queries/species-suggestions";
import { writePhotoFile } from "@/lib/opfs-files";
import { newId } from "@/db/id";

const CATEGORY_ICON: Record<string, string> = {
  fish: "🐟",
  shrimp: "🦐",
  snail: "🐌",
  crayfish: "🦞",
  plant: "🌿",
};

function firstName(json: string | null | undefined, fallback: string): string {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed[0] ? parsed[0] : fallback;
  } catch {
    return fallback;
  }
}

function safeParseArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadDex() {
  const [species, cards] = await Promise.all([listSpecies(), listDexCards()]);
  return { species, cards };
}

type SectionTab = "mine" | "all";

// Restyled 2026-09-02 from a list-style layout in a reference screenshot
// Jaideep shared — segmented pill tabs + photo/name/checkmark rows, in the
// scoped "soft" blue palette (tokens.css --soft-*), replacing the previous
// 3-column icon grid.
//
// Split into two top-level sections per Jaideep's request: "My Fish" (species
// already unlocked, default/first tab) and "All" (the full catalog). Both use
// the same row layout — an earlier 2-column square-card grid for "All"
// overflowed horizontally on a real phone, so that was reverted in favour of
// reusing this row style everywhere, just with locked rows dimmed/silhouetted.
export default function DexPage() {
  const router = useRouter();
  const { data } = useLiveQuery(loadDex, []);
  const [section, setSection] = useState<SectionTab>("mine");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanCandidates, setScanCandidates] = useState<PhotoCandidate[] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanPhotoFile, setScanPhotoFile] = useState<File | null>(null);
  const [suggestName, setSuggestName] = useState("");
  const [suggestNote, setSuggestNote] = useState("");
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [suggestSubmitted, setSuggestSubmitted] = useState(false);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);
  const scanGalleryInputRef = useRef<HTMLInputElement>(null);
  const [scanPickerOpen, setScanPickerOpen] = useState(false);

  const species = data?.species ?? [];
  const cardsBySpecies = new Map((data?.cards ?? []).map((c) => [c.speciesId, c]));

  const categories = Array.from(new Set(species.map((s) => s.category).filter(Boolean))) as string[];
  const difficulties = Array.from(new Set(species.map((s) => s.difficulty).filter(Boolean))) as string[];

  const q = searchQuery.trim().toLowerCase();
  const filtered = species.filter((s) => {
    const unlocked = cardsBySpecies.has(s.id);
    if (section === "mine" && !unlocked) return false;
    if (category !== "all" && s.category !== category) return false;
    if (difficulty !== "all" && s.difficulty !== difficulty) return false;
    if (section === "all" && q) {
      const names = safeParseArray(s.commonNames).concat(safeParseArray(s.commonNamesIn));
      const matches =
        s.id.toLowerCase().includes(q) ||
        s.scientificName?.toLowerCase().includes(q) ||
        names.some((n) => n.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });

  async function handleScanPhoto(file: File) {
    setScanning(true);
    setScanError(null);
    setScanCandidates(null);
    setScanPhotoFile(file);
    setSuggestSubmitted(false);
    setSuggestName("");
    setSuggestNote("");
    const upload = await downscaleForUpload(file);
    const result = await identifySpecies(upload);
    setScanning(false);
    if (!result.ok) {
      setScanError(result.error);
      return;
    }
    const data = result.data.speciesId as unknown as { candidates: PhotoCandidate[] };
    setScanCandidates(data.candidates);
    // Top result is the most useful default to prefill if the user ends up
    // suggesting it — they can still edit the name before sending.
    if (!data.candidates.some((c) => c.species_id)) {
      setSuggestName(data.candidates[0]?.common_name ?? "");
    }
  }

  function startSuggesting(candidate?: PhotoCandidate) {
    setSuggestSubmitted(false);
    setSuggestName(candidate?.common_name ?? suggestName);
    setSuggestNote(candidate?.scientific_name ? `Scientific name (AI guess): ${candidate.scientific_name}` : suggestNote);
  }

  async function handleSuggestSpecies() {
    if (!suggestName.trim()) return;
    setSuggestSubmitting(true);
    let photoUri: string | undefined;
    if (scanPhotoFile) {
      try {
        const path = `species-suggestions/${newId()}.jpg`;
        await writePhotoFile(path, scanPhotoFile);
        photoUri = path;
      } catch {
        // OPFS unavailable or write failed — the suggestion itself still matters more than the photo.
      }
    }
    await addSpeciesSuggestion({
      suggestedName: suggestName.trim(),
      note: suggestNote.trim() || undefined,
      photoUri,
      aiCandidates: scanCandidates ?? undefined,
    });
    setSuggestSubmitting(false);
    setSuggestSubmitted(true);
  }

  return (
    <Screen background="var(--soft-bg)">
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 4, color: "var(--soft-ink)" }}>Species Dex</h1>
      <p style={{ color: "var(--soft-ink-muted)", marginBottom: 16 }}>
        {cardsBySpecies.size} of {species.length} unlocked
      </p>

      <div
        style={{
          display: "flex",
          padding: 4,
          borderRadius: "var(--radius-pill)",
          background: "var(--soft-card-bg)",
          border: "1px solid var(--soft-card-border)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          marginBottom: 12,
        }}
      >
        {([
          { key: "mine", label: "My Fish" },
          { key: "all", label: "All" },
        ] as { key: SectionTab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setSection(t.key);
              setCategory("all");
              setDifficulty("all");
              setSearchQuery("");
              setScanCandidates(null);
              setScanError(null);
              setSuggestName("");
              setSuggestNote("");
              setSuggestSubmitted(false);
            }}
            style={{
              flex: 1,
              padding: "8px 14px",
              borderRadius: "var(--radius-pill)",
              border: "none",
              background: section === t.key ? "var(--soft-accent)" : "transparent",
              color: section === t.key ? "#fff" : "var(--soft-ink-muted)",
              fontSize: "var(--font-caption-size)",
              fontWeight: 700,
              transition: "background 150ms ease, color 150ms ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "all" && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--soft-card-border)",
                background: "var(--soft-card-bg)",
                color: "var(--soft-ink)",
              }}
            />
            <div style={{ position: "relative" }}>
              <input
                ref={scanCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleScanPhoto(file);
                }}
              />
              <input
                ref={scanGalleryInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleScanPhoto(file);
                }}
              />
              <button
                onClick={() => setScanPickerOpen((v) => !v)}
                disabled={scanning}
                aria-label="Scan a photo to find a species"
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: "50%",
                  border: "1px solid var(--soft-card-border)",
                  background: "var(--soft-card-bg)",
                  color: "var(--soft-ink)",
                  fontSize: 18,
                  opacity: scanning ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {scanning ? <span className="spinner" aria-label="Scanning..." /> : "📷"}
              </button>
              {scanPickerOpen && (
                <>
                  <div onClick={() => setScanPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} aria-hidden />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 6,
                      zIndex: 30,
                      background: "var(--soft-card-bg)",
                      border: "1px solid var(--soft-card-border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-lift)",
                      overflow: "hidden",
                      minWidth: 190,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setScanPickerOpen(false);
                        scanCameraInputRef.current?.click();
                      }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", fontSize: "var(--font-body-sm-size)", fontWeight: 600, color: "var(--soft-ink)", cursor: "pointer" }}
                    >
                      📷 Take photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanPickerOpen(false);
                        scanGalleryInputRef.current?.click();
                      }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderTop: "1px solid var(--soft-card-border)", fontSize: "var(--font-body-sm-size)", fontWeight: 600, color: "var(--soft-ink)", cursor: "pointer" }}
                    >
                      🖼️ Choose from gallery
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {scanError && (
            <div style={{ marginTop: 10 }}>
              <Banner severity="fixNow">{scanError}</Banner>
            </div>
          )}

          {scanCandidates && scanCandidates.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: "var(--radius-lg)",
                background: "var(--soft-card-bg)",
                border: "1px solid var(--soft-card-border)",
              }}
            >
              <p style={{ fontWeight: 700, color: "var(--soft-ink)", marginBottom: 8, fontSize: "var(--font-body-sm-size)" }}>
                Our best guesses — may or may not be in our catalog
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scanCandidates.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--soft-card-border)",
                      background: "var(--soft-bg-alt)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: "var(--soft-ink)" }}>{c.common_name}</span>{" "}
                        <span style={{ color: "var(--soft-ink-muted)", fontStyle: "italic", fontSize: "var(--font-caption-size)" }}>
                          {c.scientific_name}
                        </span>
                      </div>
                      <span style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", flexShrink: 0 }}>
                        {Math.round(c.confidence * 100)}%
                      </span>
                    </div>
                    <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", marginTop: 2, marginBottom: 8 }}>{c.why}</p>
                    {c.species_id ? (
                      <button
                        onClick={() => router.push(`/dex/${c.species_id}`)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "var(--radius-pill)",
                          border: "none",
                          background: "var(--soft-accent)",
                          color: "#fff",
                          fontSize: "var(--font-caption-size)",
                          fontWeight: 700,
                        }}
                      >
                        In our catalog — view card
                      </button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "var(--color-watch)", fontSize: "var(--font-caption-size)", fontWeight: 600 }}>
                          Not in our catalog yet
                        </span>
                        <button
                          onClick={() => startSuggesting(c)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "var(--radius-pill)",
                            border: "1px solid var(--soft-card-border)",
                            background: "transparent",
                            color: "var(--soft-ink)",
                            fontSize: "var(--font-caption-size)",
                            fontWeight: 700,
                          }}
                        >
                          Suggest adding it
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(suggestName || (scanCandidates && scanCandidates.length === 0)) && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: "var(--radius-lg)",
                background: "var(--soft-card-bg)",
                border: "1px solid var(--soft-card-border)",
              }}
            >
              {suggestSubmitted ? (
                <p style={{ color: "var(--color-improve)", fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>
                  Thanks — sent for review.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontWeight: 700, color: "var(--soft-ink)", fontSize: "var(--font-body-sm-size)" }}>
                    Suggest this fish for our catalog
                  </p>
                  <input
                    type="text"
                    value={suggestName}
                    onChange={(e) => setSuggestName(e.target.value)}
                    placeholder="What fish is this? (name)"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--soft-card-border)",
                      background: "var(--soft-bg-alt)",
                      color: "var(--soft-ink)",
                    }}
                  />
                  <input
                    type="text"
                    value={suggestNote}
                    onChange={(e) => setSuggestNote(e.target.value)}
                    placeholder="Anything else? (optional)"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--soft-card-border)",
                      background: "var(--soft-bg-alt)",
                      color: "var(--soft-ink)",
                    }}
                  />
                  <button
                    onClick={handleSuggestSpecies}
                    disabled={!suggestName.trim() || suggestSubmitting}
                    style={{
                      padding: "10px",
                      borderRadius: "var(--radius-pill)",
                      border: "none",
                      background: "var(--soft-accent)",
                      color: "#fff",
                      fontWeight: 700,
                      opacity: !suggestName.trim() || suggestSubmitting ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {suggestSubmitting && <span className="spinner" aria-hidden />}
                    {suggestSubmitting ? "Sending..." : "Suggest this fish"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--soft-card-border)",
            background: "var(--soft-card-bg)",
            color: "var(--soft-ink)",
          }}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--soft-card-border)",
            background: "var(--soft-card-bg)",
            color: "var(--soft-ink)",
          }}
        >
          <option value="all">All difficulties</option>
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((s) => {
          const unlocked = cardsBySpecies.has(s.id);
          const icon = CATEGORY_ICON[s.category ?? ""] ?? "❓";
          const name = firstName(s.commonNames, s.id);
          return (
            <Link key={s.id} href={`/dex/${s.id}`}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 10,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--soft-card-bg)",
                  border: "1px solid var(--soft-card-border)",
                  backdropFilter: "blur(var(--glass-blur))",
                  WebkitBackdropFilter: "blur(var(--glass-blur))",
                  boxShadow: unlocked ? "var(--shadow-sm)" : "none",
                  opacity: unlocked ? 1 : 0.7,
                }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--soft-accent-soft)",
                  }}
                >
                  {unlocked && s.imageUri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 20 }} aria-hidden>
                      {icon}
                    </span>
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: "var(--soft-ink)", display: "flex", alignItems: "center", gap: 6 }}>
                    {name}
                    {isAiGenerated(s) && <Chip variant="unverified">AI</Chip>}
                  </p>
                  <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", textTransform: "capitalize" }}>
                    {s.category ?? "species"}
                    {s.difficulty ? ` · ${s.difficulty}` : ""}
                  </p>
                </div>
                <span
                  aria-hidden
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "#fff",
                    background: unlocked ? "var(--color-improve)" : "var(--soft-card-border)",
                  }}
                >
                  {unlocked ? "✓" : "🔒"}
                </span>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p style={{ color: "var(--soft-ink-muted)", textAlign: "center", marginTop: 32 }}>
            {section === "mine"
              ? "No unlocked fish match these filters yet — add one to a tank to unlock its card."
              : "No species match these filters."}
          </p>
        )}
      </div>
    </Screen>
  );
}
