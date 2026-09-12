"use client";

import { use, useState, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Banner } from "@/components/Banner";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { DexUnlockToast } from "@/components/DexUnlockToast";
import { GalleryPanel } from "@/components/GalleryPanel";
import { JournalPanel } from "@/components/JournalPanel";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { Status, type StatusVariant } from "@/components/Status";
import { useLivestockScanSession } from "@/store/use-livestock-scan-session";
import { useLiveQuery } from "@/db/live";
import { getTank, deleteTank, updateTank } from "@/db/queries/tanks";
import { listEquipmentForTank } from "@/db/queries/equipment";
import { listLivestockForTank, removeLivestock, updateLivestockCount } from "@/db/queries/livestock";
import { listPhotosForTank, addPhoto } from "@/db/queries/photos";
import { listSpecies } from "@/db/queries/species";
import { listLogEntriesForTank } from "@/db/queries/log-entries";
import { getEffectiveParameterDefs } from "@/db/queries/parameter-defs";
import { getLastMeasurement } from "@/db/queries/measurements";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { usePhotoSrc } from "@/lib/use-photo-src";
import { uploadPhoto } from "@/lib/photo-upload";
import { checkFilterFlow, checkHeaterWattage } from "@/lib/derived-checks";
import { isAiGenerated } from "@/lib/species-origin";
import { useUnits } from "@/lib/UnitsProvider";
import { formatLength, formatVolume, formatTempRange } from "@/lib/units";
import { useTranslation } from "@/i18n/use-translation";

type SpeciesRow = Awaited<ReturnType<typeof listSpecies>>[number];

function firstName(json: string | null | undefined): string | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
  } catch {
    return null;
  }
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTH_ABBR[date.getMonth()]}, ${date.getFullYear()}`;
}

type WaterRow = { name: string; unit: string; value: number | null; decimals: number; inRange: boolean | null };

// The brief's own named example of what Tank Detail was missing entirely —
// a "Water" section with the 4 core test-kit readings and a checkmark per
// value (Section 4, redesign brief Screen 2's mockup). This also fixes a
// real, separate bug found while building it: nothing anywhere in the app
// actually linked to /tank/[id]/log (the parameter-logging screen already
// existed and worked, it was just an orphaned route with zero navigation
// into it) — the Water card now does.
const WATER_PARAM_ORDER = ["pH", "Ammonia", "Nitrite", "Nitrate"];

async function loadWaterData(tankId: string): Promise<WaterRow[]> {
  const defs = await getEffectiveParameterDefs(tankId);
  const byName = new Map(defs.map((d) => [d.name, d]));
  const rows: WaterRow[] = [];
  for (const name of WATER_PARAM_ORDER) {
    const def = byName.get(name);
    if (!def) continue;
    const last = await getLastMeasurement(tankId, def.id);
    const value = last?.value ?? null;
    const inRange =
      value == null
        ? null
        : (def.targetMin == null || value >= def.targetMin) && (def.targetMax == null || value <= def.targetMax);
    rows.push({ name, unit: def.unit, value, decimals: def.decimals ?? 1, inRange });
  }
  return rows;
}

export default function TankOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslation();
  const setPendingLivestockScanFile = useLivestockScanSession((s) => s.setPendingFile);
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);
  const { data: equipmentList } = useLiveQuery(() => listEquipmentForTank(id), [id]);
  const { data: livestock } = useLiveQuery(() => listLivestockForTank(id), [id]);
  const { data: allSpecies } = useLiveQuery(() => listSpecies(), []);
  const { data: photos } = useLiveQuery(() => listPhotosForTank(id), [id]);
  const { data: journalEntries } = useLiveQuery(() => listLogEntriesForTank(id), [id]);
  const { data: waterRows } = useLiveQuery(() => loadWaterData(id), [id]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [livestockExpanded, setLivestockExpanded] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [galleryExpanded, setGalleryExpanded] = useState(false);
  const [journalExpanded, setJournalExpanded] = useState(false);
  const [journalAutoOpenNew, setJournalAutoOpenNew] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [addPhotoError, setAddPhotoError] = useState<string | null>(null);

  if (!tank) return <Screen>{t.common.loading}</Screen>;

  async function handleConfirmDelete() {
    setDeleting(true);
    await deleteTank(id);
    router.replace("/");
  }

  // A tank saved with no photo (the picture step in the creation wizard is
  // optional) had no way to add one afterward except burrowing into Edit
  // Tank — Jaideep's ask: put an inviting placeholder right here instead.
  // Same write pattern as Edit Tank's own handlePhotoChange (avatar +
  // Gallery entry together, so it doesn't silently miss the Gallery like
  // an earlier bug here once did). Uploads to Vercel Blob (uploadPhoto),
  // not OPFS, since 2026-09-11 — tanks/photos are both server-backed now,
  // so the photo itself needs to be reachable from any device too.
  async function handleAddPhoto(file: File) {
    setAddingPhoto(true);
    setAddPhotoError(null);
    try {
      const url = await uploadPhoto(file);
      await updateTank(id, { photoUri: url });
      await addPhoto({ tankId: id, localUri: url, caption: "Tank photo" });
    } catch {
      setAddPhotoError(t.settingsPage.couldNotUploadPhoto);
    } finally {
      setAddingPhoto(false);
    }
  }

  async function handleHide() {
    setShowMenu(false);
    await updateTank(id, { status: "archived" });
    router.replace("/");
  }

  const equipmentWarnings = (equipmentList ?? []).flatMap((eq) => {
    const warnings = [];
    if (eq.type === "filter") {
      const w = checkFilterFlow(tank.volumeL, eq.ratedLph);
      if (w) warnings.push(w);
    }
    if (eq.type === "heater") {
      const w = checkHeaterWattage(tank.volumeL, eq.wattage);
      if (w) warnings.push(w);
    }
    return warnings;
  });

  const aliveLivestock = (livestock ?? []).filter((l) => l.status === "alive");
  const setupDate = tank.startedOn ? new Date(tank.startedOn) : new Date(tank.createdAt);
  const dateLabel = `${t.tankOverviewPage.created} ${formatDate(setupDate)}`;
  const waterBadge = tank.waterType === "brackish" ? { label: t.home.brackish, color: "var(--color-deep)" } : { label: t.home.freshwater, color: "var(--color-improve)" };

  const aliveSpeciesRows = aliveLivestock
    .map((l) => (allSpecies ?? []).find((s) => s.id === l.speciesId))
    .filter((s): s is NonNullable<typeof s> => !!s && s.tempCMin != null && s.tempCMax != null);
  // "Recommended" temp is the overlap of every kept species' own safe range
  // (highest min, lowest max) — the actual constraint the tank is under —
  // not a single species' number. Only shown once there's a real range to
  // intersect; no fish yet means nothing to recommend.
  const recommendedTempC =
    aliveSpeciesRows.length > 0
      ? {
          min: Math.max(...aliveSpeciesRows.map((s) => s.tempCMin as number)),
          max: Math.min(...aliveSpeciesRows.map((s) => s.tempCMax as number)),
        }
      : null;

  // Redesign brief Screen 2, High-priority finding: "'Healthy' lacks enough
  // context" — this used to be a hardcoded "● Healthy" string, always, no
  // matter what. It now reflects the real derived equipment checks already
  // computed above (checkFilterFlow/checkHeaterWattage) plus whether the
  // tank actually has fish — the only real signals this screen has on hand
  // without inventing a fake "4 indicators" score. Real parameter-out-of-
  // range checks (Water section below) aren't folded in here since a
  // logged-but-in-range reading isn't a warning, and a never-logged one
  // isn't either — only genuine equipment findings currently drive a
  // "needs attention" status.
  let statusVariant: StatusVariant;
  let statusLabel: string;
  let statusExplanation: string;
  if (aliveLivestock.length === 0) {
    statusVariant = "neutral";
    statusLabel = t.home.statusNoFish;
    statusExplanation = t.home.statusNoFishExplanation;
  } else if (equipmentWarnings.length > 0) {
    statusVariant = "watch";
    statusLabel = t.home.statusNeedsAttention;
    statusExplanation = (equipmentWarnings.length === 1 ? t.home.statusNeedsAttentionExplanation : t.home.statusNeedsAttentionExplanationPlural).replace(
      "{n}",
      String(equipmentWarnings.length)
    );
  } else {
    statusVariant = "improve";
    statusLabel = t.home.statusOk;
    statusExplanation = t.home.statusOkExplanation.replace("{n}", String(aliveLivestock.reduce((sum, l) => sum + l.count, 0)));
  }

  return (
    <Screen>
      {unlockToast && <DexUnlockToast speciesName={unlockToast} onDismiss={() => setUnlockToast(null)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t.common.back}
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "1px solid var(--color-line)",
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            fontSize: 16,
          }}
        >
          ←
        </button>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            aria-label={t.tankOverviewPage.moreActions}
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "1px solid var(--color-line)",
              background: "var(--color-surface)",
              color: "var(--color-ink)",
              fontSize: 18,
            }}
          >
            ⋮
          </button>
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} aria-hidden />
              <div
                style={{
                  position: "absolute",
                  top: 42,
                  right: 0,
                  zIndex: 30,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.2))",
                  overflow: "hidden",
                  minWidth: 140,
                }}
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    router.push(`/tank/${id}/edit`);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--color-ink)", fontSize: "var(--font-body-sm-size)" }}
                >
                  {t.tankOverviewPage.editTank}
                </button>
                <button
                  onClick={handleHide}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--color-ink)", fontSize: "var(--font-body-sm-size)" }}
                >
                  {t.home.hide}
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--color-fix-now)", fontSize: "var(--font-body-sm-size)" }}
                >
                  {t.tankOverviewPage.deleteWord}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <h1 style={{ fontSize: "var(--font-title-size)", margin: 0, lineHeight: 1.15 }}>{tank.name}</h1>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: waterBadge.color,
              color: "var(--color-surface)",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: "var(--font-caption-size)",
              fontWeight: 600,
            }}
          >
            {waterBadge.label}
          </span>
        </div>
        {/* Real, explained status (redesign brief High-priority finding:
            "'Healthy' lacks enough context") replaces the old hardcoded
            "● Healthy" that never said why. */}
        <div style={{ marginTop: 8 }}>
          <Status variant={statusVariant} label={statusLabel} explanation={statusExplanation} />
        </div>
      </div>

      {tank.photoUri ? (
        <div style={{ marginBottom: 8 }}>
          <TankBigPhoto photoUri={tank.photoUri} />
        </div>
      ) : (
        <div
          style={{
            marginBottom: 8,
            padding: "20px 16px",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--color-line)",
            background: "var(--color-surface-alt)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            textAlign: "center",
          }}
        >
          <span aria-hidden style={{ fontSize: 28 }}>
            📷
          </span>
          <p style={{ margin: 0, fontSize: "var(--font-body-sm-size)", color: "var(--color-ink-muted)" }}>
            {addingPhoto ? t.tankOverviewPage.addingPhoto : t.tankOverviewPage.addPhotoOfTank}
          </p>
          <PhotoPickerButton label={addingPhoto ? t.livestockScanPage.addingEllipsis : t.tankOverviewPage.addAPhoto} onPick={handleAddPhoto} />
          {addPhotoError && (
            <p style={{ margin: 0, fontSize: "var(--font-caption-size)", color: "var(--color-fix-now)" }}>{addPhotoError}</p>
          )}
        </div>
      )}

      <AboutSection tank={tank} recommendedTempC={recommendedTempC} dateLabel={dateLabel} />

      {/* Redesign brief Screen 2's own mockup names this section
          explicitly — pH/Ammonia/Nitrite/Nitrate with a checkmark each.
          Tapping through goes to the real parameter-logging screen, which
          (real bug found while building this) had no link anywhere in the
          app pointing at it before now. Hidden entirely (not shown with
          placeholders) until at least one reading has actually been
          logged — Jaideep asked for no "Not logged yet" rows. */}
      {(waterRows ?? []).some((row) => row.value != null) && (
      <Link href={`/tank/${id}/log`} style={{ display: "block", marginBottom: 16 }}>
        <Card>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>{t.tankOverviewPage.water}</p>
          {(waterRows ?? []).filter((row) => row.value != null).map((row) => (
            <div key={row.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span style={{ fontSize: "var(--font-body-sm-size)", color: "var(--color-ink-muted)" }}>{row.name}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--font-body-sm-size)", fontWeight: 600 }}>
                {row.value!.toFixed(row.decimals)}
                <span aria-hidden style={{ color: row.inRange ? "var(--color-improve)" : "var(--color-watch)" }}>
                  {row.inRange ? "✓" : "⚠"}
                </span>
              </span>
            </div>
          ))}
        </Card>
      </Link>
      )}

      <Link href={`/tank/${id}/check`} style={{ display: "block", marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-deep)",
            color: "#fff",
          }}
        >
          <span aria-hidden style={{ fontSize: 18, flexShrink: 0 }}>
            🩺
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: "var(--font-body-sm-size)" }}>{t.checkPage.healthCheck}</strong>
            <p
              style={{
                fontSize: "var(--font-caption-size)",
                opacity: 0.85,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {t.tankOverviewPage.expertAnalysis}
            </p>
          </div>
          <span aria-hidden style={{ fontSize: 16, flexShrink: 0 }}>
            ›
          </span>
        </div>
      </Link>

      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.home.deleteTankQuestion}
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
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 340,
              background: "var(--color-surface, var(--color-ground))",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              textAlign: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 6 }}>{t.home.deleteTankQuestion}</p>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 20 }}>
              {t.home.deleteTankBody.replace("{name}", tank.name)}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryButton onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                {t.home.no}
              </SecondaryButton>
              <DangerButton onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? t.home.deleting : t.home.yesDelete}
              </DangerButton>
            </div>
          </div>
        </div>
      )}

      {equipmentWarnings.map((w) => (
        <div key={w.key} style={{ marginBottom: 8 }}>
          <Banner severity={w.severity}>{w.message}</Banner>
        </div>
      ))}

      <CollapsedSectionCard
        label={t.livestockPage.fish}
        onToggle={() => setLivestockExpanded((v) => !v)}
        onAdd={() => setShowAddPopup(true)}
        expanded={livestockExpanded}
        preview={
          aliveLivestock.length > 0 ? (
            <StackedThumbs
              items={aliveLivestock.map((l) => {
                const sp = (allSpecies ?? []).find((s) => s.id === l.speciesId);
                return { key: l.id, imageUri: sp?.imageUri, category: sp?.category };
              })}
            />
          ) : (
            <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>{t.tankOverviewPage.noFishAddedYetShort}</span>
          )
        }
      />

      {livestockExpanded && (
        <div style={sectionBodyStyle}>
          <div style={{ paddingTop: 8, paddingBottom: 4 }}>
            <SecondaryButton onClick={() => setShowAddPopup(true)}>⊕ {t.tankOverviewPage.addFishLower}</SecondaryButton>
          </div>
          {aliveLivestock.length === 0 && (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", padding: "6px 0" }}>{t.livestockPage.noFishAddedYet}</p>
          )}
          {aliveLivestock.map((l) => (
            <LivestockInlineRow
              key={l.id}
              livestock={l}
              species={(allSpecies ?? []).find((s) => s.id === l.speciesId)}
              confirmingDelete={confirmDeleteId === l.id}
              onAskDelete={() => setConfirmDeleteId(l.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={async () => {
                await removeLivestock(l.id);
                setConfirmDeleteId(null);
              }}
            />
          ))}
        </div>
      )}

      {showAddPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.livestockSearchPage.addAFish}
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
          onClick={() => setShowAddPopup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 320,
              background: "var(--color-surface, var(--color-ground))",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              textAlign: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 16 }}>{t.livestockSearchPage.addAFish}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PrimaryButton onClick={() => router.push(`/tank/${id}/livestock/search`)}>🔍 {t.tankOverviewPage.searchByName}</PrimaryButton>
              <PhotoPickerButton
                label={`📷 ${t.tankOverviewPage.takeAPic}`}
                onPick={(file) => {
                  setPendingLivestockScanFile(file);
                  setShowAddPopup(false);
                  router.push(`/tank/${id}/livestock/scan`);
                }}
              />
            </div>
            <div style={{ height: 10 }} />
            <SecondaryButton onClick={() => setShowAddPopup(false)}>{t.common.cancel}</SecondaryButton>
          </div>
        </div>
      )}

      <CollapsedSectionCard
        label={t.galleryPage.title}
        onToggle={() => setGalleryExpanded((v) => !v)}
        onAdd={() => setGalleryExpanded(true)}
        expanded={galleryExpanded}
        preview={
          <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
            {(photos ?? []).length > 0 ? t.tankOverviewPage.nPhotos.replace("{n}", String((photos ?? []).length)) : t.tankOverviewPage.noPhotosYet}
          </span>
        }
      />
      {galleryExpanded && (
        <div style={sectionBodyStyle}>
          <GalleryPanel tankId={id} />
        </div>
      )}

      <CollapsedSectionCard
        label={t.journalPage.title}
        onToggle={() => setJournalExpanded((v) => !v)}
        onAdd={() => {
          setJournalExpanded(true);
          setJournalAutoOpenNew(true);
        }}
        expanded={journalExpanded}
        preview={
          <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
            {(journalEntries ?? []).length > 0 ? t.tankOverviewPage.nEntries.replace("{n}", String((journalEntries ?? []).length)) : t.tankOverviewPage.noEntriesYet}
          </span>
        }
      />
      {journalExpanded && (
        <div style={sectionBodyStyle}>
          <JournalPanel tankId={id} autoOpenNew={journalAutoOpenNew} />
        </div>
      )}
    </Screen>
  );
}

const sectionBodyStyle: CSSProperties = {
  border: "1px solid var(--color-line)",
  borderTop: "none",
  borderBottomLeftRadius: "var(--radius-lg)",
  borderBottomRightRadius: "var(--radius-lg)",
  padding: "10px 14px 14px",
  marginBottom: 10,
};

/**
 * A collapsed-by-default section summary: a dark rounded bar with an
 * uppercase label, a small preview (e.g. stacked species thumbnails), and
 * an "+ Add" action, matching Jaideep's reference screenshot. Tapping
 * anywhere on the bar opens the section's full page; tapping "+ Add"
 * specifically jumps straight into that page's add flow instead.
 */
function CollapsedSectionCard({
  label,
  href,
  addHref,
  onToggle,
  onAdd,
  preview,
  expanded,
  keepAddWhenExpanded,
}: {
  label: string;
  /** Either a route to navigate to, or (with `onToggle`) omit and handle the tap locally — e.g. Livestock expands inline instead of leaving the page. */
  href?: string;
  addHref?: string;
  onToggle?: () => void;
  onAdd?: () => void;
  preview: ReactNode;
  expanded?: boolean;
  /** Livestock's "+ Add" opens a popup (search/photo), not something already visible in the expanded list — unlike Gallery/Journal, whose own panel surfaces its own add affordance once open, so keep it showing here. */
  keepAddWhenExpanded?: boolean;
}) {
  const router = useRouter();
  const t = useTranslation();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => (onToggle ? onToggle() : href && router.push(href))}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        if (onToggle) onToggle();
        else if (href) router.push(href);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "14px 16px",
        borderRadius: "var(--radius-lg)",
        background: "transparent",
        border: "1px solid var(--color-line)",
        marginBottom: expanded ? 0 : 10,
        borderBottomLeftRadius: expanded ? 0 : undefined,
        borderBottomRightRadius: expanded ? 0 : undefined,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          style={{
            color: "var(--color-ink)",
            fontSize: "var(--font-caption-size)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {label}
        </span>
        {preview}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {(!expanded || keepAddWhenExpanded) &&
          (onAdd ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
                background: "none",
                border: "none",
                color: "var(--color-improve)",
                fontWeight: 700,
                fontSize: "var(--font-caption-size)",
                cursor: "pointer",
              }}
            >
              <span aria-hidden>⊕</span> {t.common.add}
            </button>
          ) : (
            <Link
              href={addHref!}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
                color: "var(--color-improve)",
                fontWeight: 700,
                fontSize: "var(--font-caption-size)",
              }}
            >
              <span aria-hidden>⊕</span> {t.common.add}
            </Link>
          ))}
        <span
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            flexShrink: 0,
            marginLeft: 4,
            borderRadius: "50%",
            border: "1px solid var(--color-line)",
            color: "var(--color-ink)",
            fontSize: 18,
            lineHeight: 1,
            fontWeight: 700,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          ⌄
        </span>
      </div>
    </div>
  );
}

/** Overlapping circular species thumbnails, most-recent-first, capped with a "+N" badge. */
function StackedThumbs({ items }: { items: { key: string; imageUri?: string | null; category?: string | null }[] }) {
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((it, i) => (
        <div key={it.key} style={{ marginLeft: i === 0 ? 0 : -10, border: "2px solid var(--color-line)", borderRadius: "50%" }}>
          <SpeciesThumb imageUri={it.imageUri} category={it.category} size={32} />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            marginLeft: -10,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "2px solid var(--color-line)",
            background: "var(--color-surface-alt)",
            color: "var(--color-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--font-caption-size)",
            fontWeight: 700,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

/** One row in the inline (expand-in-place, no navigation) livestock list — photo, name, added date, an editable count, and a bin icon. */
function LivestockInlineRow({
  livestock,
  species,
  confirmingDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  livestock: { id: string; speciesId: string; count: number; addedOn: string };
  species: SpeciesRow | undefined;
  confirmingDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const t = useTranslation();
  const [countValue, setCountValue] = useState(String(livestock.count));

  async function commitCount() {
    const n = Number(countValue);
    // Never save 0 (or garbage) — a fish row with a zero count makes no
    // sense; if the tap was meant to remove it, that's the bin icon's job.
    if (!Number.isFinite(n) || n < 1) {
      setCountValue(String(livestock.count));
      return;
    }
    if (n !== livestock.count) await updateLivestockCount(livestock.id, n);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--color-line-soft)" }}>
      <SpeciesThumb imageUri={species?.imageUri} category={species?.category} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: "var(--font-body-sm-size)" }}>
          {firstName(species?.commonNames) ?? livestock.speciesId} {isAiGenerated(species) && <Chip variant="unverified">{t.dexPage.ai}</Chip>}
        </strong>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "1px 0 0" }}>
          {t.tankOverviewPage.addedDate} {new Date(livestock.addedOn).toLocaleDateString()}
        </p>
      </div>

      {confirmingDelete ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>{t.tankOverviewPage.removeQuestion}</span>
          <button
            type="button"
            onClick={onConfirmDelete}
            style={{ background: "var(--color-fix-now)", color: "#fff", border: "none", borderRadius: "var(--radius-sm, 6px)", padding: "4px 8px", fontSize: "var(--font-caption-size)", fontWeight: 700, cursor: "pointer" }}
          >
            {t.tankOverviewPage.yes}
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            style={{ background: "none", border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm, 6px)", padding: "4px 8px", fontSize: "var(--font-caption-size)", cursor: "pointer" }}
          >
            {t.home.no}
          </button>
        </div>
      ) : (
        <>
          <input
            type="number"
            min={1}
            value={countValue}
            onChange={(e) => setCountValue(e.target.value)}
            onBlur={commitCount}
            style={{
              width: 48,
              flexShrink: 0,
              padding: "4px 6px",
              textAlign: "center",
              borderRadius: "var(--radius-sm, 6px)",
              border: "1px solid var(--color-line)",
              background: "var(--color-surface)",
              color: "var(--color-ink)",
              fontSize: "var(--font-caption-size)",
              fontWeight: 600,
            }}
          />
          <button
            type="button"
            onClick={onAskDelete}
            aria-label={t.tankOverviewPage.removeFish}
            style={{ flexShrink: 0, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--color-fix-now)", fontSize: 18, cursor: "pointer" }}
          >
            🗑️
          </button>
        </>
      )}
    </div>
  );
}

/** Tank specs at a glance, right under the hero photo — size, water type, and the safe temperature overlap of whatever's actually living in the tank right now. */
/**
 * Redesign brief Screen 2, High-priority finding: "Size/Volume/Temp metrics
 * have weak hierarchy" — three equal-weight columns used to read as
 * indistinguishable. Volume and temperature are now the two primary
 * numbers (large, bold), with the exact dimensions as a smaller secondary
 * line underneath — the brief's own example ("54.9 L / 27.4°C" big,
 * "61×30×30cm" small). The setup date and Planted tag (previously sitting
 * right under the title, competing with the header) move down here as
 * quiet fine print — the brief's own Medium finding was that the date "has
 * too much prominence for its value," not that it should disappear.
 */
function AboutSection({
  tank,
  recommendedTempC,
  dateLabel,
}: {
  tank: { lengthCm: number; widthCm: number; heightCm: number; volumeL: number; isPlanted: boolean | null };
  recommendedTempC: { min: number; max: number } | null;
  dateLabel: string;
}) {
  const t = useTranslation();
  const units = useUnits();

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 24 }}>
        <div>
          <p style={{ fontSize: "var(--font-title-size)", fontWeight: 700, margin: 0, lineHeight: 1.1 }}>{formatVolume(tank.volumeL, units)}</p>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "2px 0 0" }}>{t.tankOverviewPage.volume}</p>
        </div>
        <div>
          <p style={{ fontSize: "var(--font-title-size)", fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
            {recommendedTempC ? formatTempRange(recommendedTempC.min, recommendedTempC.max, units) : "—"}
          </p>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "2px 0 0" }}>
            {recommendedTempC ? t.dexDetailPage.temp : t.tankOverviewPage.addFishForRange}
          </p>
        </div>
      </div>
      <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
        {formatLength(tank.lengthCm, units)} × {formatLength(tank.widthCm, units)} × {formatLength(tank.heightCm, units)}
        <span aria-hidden>·</span>
        {dateLabel}
        {tank.isPlanted && (
          <>
            <span aria-hidden>·</span>
            {t.home.planted}
          </>
        )}
      </p>
    </div>
  );
}

/** Large hero photo below the tank header — the tank's own photo, full width, rounded corners. Only rendered when a photo exists (no fallback image, unlike the header avatar, since this is a bigger, more prominent slot). */
function TankBigPhoto({ photoUri }: { photoUri: string }) {
  const url = usePhotoSrc(photoUri);

  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: "var(--radius-lg)", display: "block" }} />
  );
}

