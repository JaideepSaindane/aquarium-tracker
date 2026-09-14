"use client";

import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Chip } from "@/components/Chip";
import { Banner } from "@/components/Banner";
import { useLiveQuery } from "@/db/live";
import { listSpecies } from "@/db/queries/species";
import { listDexCards } from "@/db/queries/dex";
import { listTanks } from "@/db/queries/tanks";
import { listAllAliveLivestock } from "@/db/queries/livestock";
import { isAiGenerated } from "@/lib/species-origin";
import { identifySpecies } from "@/lib/ai-client";
import { downscaleForUpload } from "@/lib/image-quality/browser";
import { addSpeciesSuggestion, type PhotoCandidate } from "@/db/queries/species-suggestions";
import { uploadPhoto } from "@/lib/photo-upload";
import { useUnitsContext } from "@/lib/UnitsProvider";
import { formatTempRange } from "@/lib/units";
import { useTranslation } from "@/i18n/use-translation";

const CATEGORY_ICON: Record<string, string> = {
  fish: "🐟",
  shrimp: "🦐",
  snail: "🐌",
  crayfish: "🦞",
  plant: "🌿",
};

/** dGH band → a plain-language water-hardness descriptor — Jaideep asked for this instead of a raw pH number, matching the reference image's "Soft & Acidic" style chip. Bands follow the standard aquarium-hobby dGH scale (soft < 6, medium 6–12, hard > 12); the midpoint of the species' own range decides which band it falls in. */
function hardnessLabel(min: number, max: number, t: ReturnType<typeof useTranslation>): string {
  const mid = (min + max) / 2;
  if (mid < 6) return t.dexPage.softWater;
  if (mid > 12) return t.dexPage.hardWater;
  return t.dexPage.mediumWater;
}

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
  const [species, cards, tanks, livestock] = await Promise.all([listSpecies(), listDexCards(), listTanks(), listAllAliveLivestock()]);
  return { species, cards, tanks, livestock };
}

/** A small, self-contained pill chip that shows the current value of one filter and opens a dropdown of its options — replaces a full horizontally-scrolling row of every option with one compact control, per the reference image. */
function FilterChip({
  label,
  value,
  options,
  allLabel,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  allLabel: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (v: string) => void;
}) {
  const isAll = value === "all";
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          padding: "8px 14px",
          minHeight: 36,
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--soft-card-border)",
          background: isAll ? "var(--soft-card-bg)" : "var(--soft-accent-soft)",
          color: isAll ? "var(--soft-ink)" : "var(--soft-accent)",
          fontSize: "var(--font-caption-size)",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {!isAll && <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soft-accent)" }} />}
        <span style={{ textTransform: "capitalize" }}>{isAll ? label : value}</span>
        <span aria-hidden style={{ fontSize: 10 }}>{open ? "︿" : "﹀"}</span>
      </button>
      {open && (
        <>
          <div onClick={onToggle} style={{ position: "fixed", inset: 0, zIndex: 29 }} aria-hidden />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 6,
              zIndex: 30,
              background: "var(--soft-card-bg)",
              border: "1px solid var(--soft-card-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lift)",
              overflow: "hidden",
              minWidth: 170,
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {["all", ...options].map((opt) => (
              <button
                key={opt}
                onClick={() => onSelect(opt)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  background: opt === value ? "var(--soft-accent-soft)" : "none",
                  border: "none",
                  borderTop: opt === "all" ? "none" : "1px solid var(--soft-card-border)",
                  fontSize: "var(--font-body-sm-size)",
                  fontWeight: 600,
                  color: opt === value ? "var(--soft-accent)" : "var(--soft-ink)",
                  textTransform: "capitalize",
                  cursor: "pointer",
                }}
              >
                {opt === "all" ? allLabel : opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Restyled 2026-09-02 from a list-style layout in a reference screenshot
// Jaideep shared — segmented pill tabs + photo/name/checkmark rows, in the
// scoped "soft" blue palette (tokens.css --soft-*), replacing the previous
// 3-column icon grid.
//
// Restyled again 2026-09-13 against a second reference screenshot: filled
// pill tabs with counts ("My Fish 4" / "All Species 1,484"), a single
// search bar with an inline scan-camera button, two compact dropdown
// filter chips (Categories/Difficulty — replacing the earlier row of every
// option scrolling horizontally), and richer per-species rows: a rounded-
// square thumbnail (with a small tank-name badge when it's actually in one
// of the viewer's tanks — real data, not the reference's generic "Tank #1"
// placeholder), a filled checkmark circle for species already unlocked,
// and a row of stat chips (temperature range, pH range, temperament) below
// the name. The reference's "Freshwater" chip was dropped — every species
// in this catalog already is freshwater (CLAUDE.md's scope), so a filter
// that can never exclude anything isn't a real control, just a static
// label; not worth adding for that.
//
// Restructured again 2026-09-14 (Jaideep, after discussing the layout
// directly): the My Fish / All Species pill tabs are gone — there's just
// one species list now. "Take a photo to find" moved to the very top,
// above everything, since it's identification (a page-level feature), not
// catalog browsing that belongs to either tab. Below it, a plain "Saved
// Fish (N)" row toggles a filter on the same list instead of switching to
// a separate tab/section — tap it once to show only what's already in My
// Fish, tap again to go back to the full catalog. Search and the category/
// difficulty filter chips apply on top of whichever set is showing.
export default function DexPage() {
  const router = useRouter();
  const t = useTranslation();
  const { units } = useUnitsContext();
  const { data } = useLiveQuery(loadDex, []);
  const [savedOnly, setSavedOnly] = useState(false);
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false);
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
  const tankNameById = new Map((data?.tanks ?? []).map((tk) => [tk.id, tk.name]));

  const stockBySpecies = new Map<string, { total: number; tankCounts: Map<string, number> }>();
  for (const row of data?.livestock ?? []) {
    const entry = stockBySpecies.get(row.speciesId) ?? { total: 0, tankCounts: new Map<string, number>() };
    entry.total += row.count;
    entry.tankCounts.set(row.tankId, (entry.tankCounts.get(row.tankId) ?? 0) + row.count);
    stockBySpecies.set(row.speciesId, entry);
  }

  const categories = Array.from(new Set(species.map((s) => s.category).filter(Boolean))) as string[];
  const difficulties = Array.from(new Set(species.map((s) => s.difficulty).filter(Boolean))) as string[];

  const q = searchQuery.trim().toLowerCase();
  const filtered = species.filter((s) => {
    const unlocked = cardsBySpecies.has(s.id);
    if (savedOnly && !unlocked) return false;
    if (category !== "all" && s.category !== category) return false;
    if (difficulty !== "all" && s.difficulty !== difficulty) return false;
    if (q) {
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
    setSuggestNote(candidate?.scientific_name ? `${t.dexPage.scientificNameAiGuess} ${candidate.scientific_name}` : suggestNote);
  }

  async function handleSuggestSpecies() {
    if (!suggestName.trim()) return;
    setSuggestSubmitting(true);
    let photoUri: string | undefined;
    if (scanPhotoFile) {
      try {
        // Uploads to Vercel Blob (2026-09-11), not OPFS — species
        // suggestions are server-backed now, so the photo needs to be too.
        photoUri = await uploadPhoto(scanPhotoFile);
      } catch {
        // Upload failed (e.g. offline) — the suggestion itself still matters more than the photo.
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
      <h1 style={{ fontSize: "var(--font-title-size)", marginBottom: 4, color: "var(--soft-ink)" }}>{t.dexPage.title}</h1>
      <p style={{ color: "var(--soft-ink-muted)", marginBottom: 16 }}>{t.dexPage.subtitle}</p>

      {/* "Find this fish" — a page-level feature, not something scoped to
          either tab (2026-09-14, Jaideep: "'Find this fish' is a big
          enough offering on its own... this should sit outside of the
          'My Fishes' or 'All Species' thingy"). Always full-size, never
          shrinks down after use ("Always full-size, don't shrink it"),
          always at the very top, always visible regardless of the Saved
          Fish filter below. */}
      <div style={{ position: "relative", marginBottom: 12 }}>
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
            aria-label={t.dexPage.scanToFind}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "16px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--soft-card-border)",
              background: "var(--soft-accent-soft)",
              color: "var(--soft-accent)",
              fontWeight: 700,
              fontSize: "var(--font-body-size)",
              opacity: scanning ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {scanning ? <span className="spinner" aria-label={t.dexPage.scanning} /> : <span aria-hidden style={{ fontSize: 22 }}>📷</span>}
            {t.dexPage.findThisFish}
          </button>
          {scanPickerOpen && (
            <>
              <div onClick={() => setScanPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} aria-hidden />
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  zIndex: 30,
                  background: "var(--soft-card-bg)",
                  border: "1px solid var(--soft-card-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lift)",
                  overflow: "hidden",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setScanPickerOpen(false);
                    scanCameraInputRef.current?.click();
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "var(--soft-accent-soft)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-sm-size)", fontWeight: 600, color: "var(--soft-accent)", cursor: "pointer" }}
                >
                  📷 {t.dexPage.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanPickerOpen(false);
                    scanGalleryInputRef.current?.click();
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "var(--soft-accent-soft)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-body-sm-size)", fontWeight: 600, color: "var(--soft-accent)", cursor: "pointer" }}
                >
                  🖼️ {t.dexPage.chooseFromGallery}
                </button>
              </div>
            </>
          )}
        </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.dexPage.searchByName}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--soft-card-border)",
              background: "var(--soft-card-bg)",
              color: "var(--soft-ink)",
            }}
          />
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
              {t.dexPage.bestGuesses}
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
                      {t.dexPage.inCatalogViewCard}
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--color-watch)", fontSize: "var(--font-caption-size)", fontWeight: 600 }}>
                        {t.dexPage.notInCatalogYet}
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
                        {t.dexPage.suggestAddingIt}
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
                {t.dexPage.thanksSentForReview}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontWeight: 700, color: "var(--soft-ink)", fontSize: "var(--font-body-sm-size)" }}>
                  {t.dexPage.suggestThisFish}
                </p>
                <input
                  type="text"
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder={t.dexPage.whatFishIsThis}
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
                  placeholder={t.dexPage.anythingElse}
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
                  {suggestSubmitting ? t.dexPage.sending : t.dexPage.suggestThisFishShort}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* flexWrap, not overflowX — a scrolling container clips an
          absolutely-positioned dropdown to its own bounds, which hid the
          FilterChip popovers entirely. Only two chips ever render here, so
          wrapping (rather than scrolling) never costs anything. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <FilterChip
          label={t.dexPage.categoriesLabel}
          value={category}
          options={categories}
          allLabel={t.dexPage.allCategories}
          open={categoryMenuOpen}
          onToggle={() => {
            setCategoryMenuOpen((v) => !v);
            setDifficultyMenuOpen(false);
          }}
          onSelect={(v) => {
            setCategory(v);
            setCategoryMenuOpen(false);
          }}
        />
        {difficulties.length > 0 && (
          <FilterChip
            label={t.dexPage.difficultyLabel}
            value={difficulty}
            options={difficulties}
            allLabel={t.dexPage.allDifficulties}
            open={difficultyMenuOpen}
            onToggle={() => {
              setDifficultyMenuOpen((v) => !v);
              setCategoryMenuOpen(false);
            }}
            onSelect={(v) => {
              setDifficulty(v);
              setDifficultyMenuOpen(false);
            }}
          />
        )}
        {/* Plain on/off toggle, not a dropdown — filters the same list down
            to what's already unlocked (2026-09-14, Jaideep: "let's add a
            toggle in the same line as category and difficulty... which
            says 'Show saved fish'"). */}
        <button
          onClick={() => setSavedOnly((v) => !v)}
          aria-pressed={savedOnly}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            padding: "8px 14px",
            minHeight: 36,
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--soft-card-border)",
            background: savedOnly ? "var(--soft-accent-soft)" : "var(--soft-card-bg)",
            color: savedOnly ? "var(--soft-accent)" : "var(--soft-ink)",
            fontSize: "var(--font-caption-size)",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {savedOnly && <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soft-accent)" }} />}
          {t.dexPage.showSavedFish}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((s) => {
          const added = cardsBySpecies.has(s.id);
          const name = firstName(s.commonNames, s.id);
          const stock = stockBySpecies.get(s.id);
          const primaryTankId = stock ? [...stock.tankCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
          const primaryTankName = primaryTankId ? tankNameById.get(primaryTankId) : undefined;
          const hasTemp = s.tempCMin != null && s.tempCMax != null;
          const hasHardness = s.hardnessDghMin != null && s.hardnessDghMax != null;

          return (
            <Link key={s.id} href={`/dex/${s.id}`}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 12,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--soft-card-bg)",
                  border: "1px solid var(--soft-card-border)",
                  backdropFilter: "blur(var(--glass-blur))",
                  WebkitBackdropFilter: "blur(var(--glass-blur))",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      background: "var(--soft-bg-alt)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {s.imageUri ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.imageUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span aria-hidden style={{ fontSize: 28 }}>
                        {CATEGORY_ICON[s.category ?? ""] ?? "❓"}
                      </span>
                    )}
                  </div>
                  {primaryTankName && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        left: 4,
                        maxWidth: 56,
                        padding: "1px 6px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {primaryTankName}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "var(--font-heading-size)", color: "var(--soft-ink)" }}>{name}</strong>
                    {s.scientificName && (
                      <span style={{ fontStyle: "italic", color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)" }}>
                        {s.scientificName}
                      </span>
                    )}
                    {isAiGenerated(s) && <Chip variant="unverified">{t.dexPage.ai}</Chip>}
                  </div>

                  {(s.difficulty || (stock && stock.total > 0)) && (
                    <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", textTransform: "capitalize", margin: "2px 0 6px" }}>
                      {s.difficulty ?? ""}
                      {s.difficulty && stock && stock.total > 0 ? " · " : ""}
                      {stock && stock.total > 0 && (
                        <span style={{ color: "var(--color-improve)", fontWeight: 700 }}>{t.dexPage.inTank.replace("{n}", String(stock.total))}</span>
                      )}
                    </p>
                  )}

                  {(hasTemp || hasHardness || s.temperament) && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", overflow: "hidden" }}>
                      {hasTemp && (
                        <span style={statChipStyle}>
                          🌡️ {formatTempRange(s.tempCMin!, s.tempCMax!, units)}
                        </span>
                      )}
                      {hasHardness && <span style={statChipStyle}>💧 {hardnessLabel(s.hardnessDghMin!, s.hardnessDghMax!, t)}</span>}
                      {s.temperament && (
                        <span style={{ ...statChipStyle, color: "var(--soft-accent)", background: "var(--soft-accent-soft)", textTransform: "capitalize" }}>
                          {s.temperament}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {added && (
                  <span
                    aria-label={t.dexPage.added}
                    style={{
                      flexShrink: 0,
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "var(--color-improve)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p style={{ color: "var(--soft-ink-muted)", textAlign: "center", marginTop: 32 }}>
            {savedOnly ? t.dexPage.noUnlockedMatch : t.dexPage.noSpeciesMatch}
          </p>
        )}
      </div>
    </Screen>
  );
}

const statChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "2px 6px",
  borderRadius: "var(--radius-pill)",
  background: "var(--soft-bg-alt)",
  color: "var(--soft-ink-muted)",
  fontSize: 10,
  fontWeight: 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
};
