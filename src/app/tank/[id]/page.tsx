"use client";

import { use, useState, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Banner } from "@/components/Banner";
import { Chip } from "@/components/Chip";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { DexUnlockToast } from "@/components/DexUnlockToast";
import { GalleryPanel } from "@/components/GalleryPanel";
import { JournalPanel } from "@/components/JournalPanel";
import { PhotoPickerButton } from "@/components/PhotoPickerButton";
import { useLivestockScanSession } from "@/store/use-livestock-scan-session";
import { useLiveQuery } from "@/db/live";
import { getTank, deleteTank, updateTank } from "@/db/queries/tanks";
import { listEquipmentForTank } from "@/db/queries/equipment";
import { listLivestockForTank, removeLivestock, updateLivestockCount } from "@/db/queries/livestock";
import { listPhotosForTank, addPhoto } from "@/db/queries/photos";
import { listSpecies } from "@/db/queries/species";
import { listLogEntriesForTank } from "@/db/queries/log-entries";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { usePhotoSrc } from "@/lib/use-photo-src";
import { uploadPhoto } from "@/lib/photo-upload";
import { checkFilterFlow, checkHeaterWattage } from "@/lib/derived-checks";
import { isAiGenerated } from "@/lib/species-origin";

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

export default function TankOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const setPendingLivestockScanFile = useLivestockScanSession((s) => s.setPendingFile);
  const { data: tank } = useLiveQuery(() => getTank(id), [id]);
  const { data: equipmentList } = useLiveQuery(() => listEquipmentForTank(id), [id]);
  const { data: livestock } = useLiveQuery(() => listLivestockForTank(id), [id]);
  const { data: allSpecies } = useLiveQuery(() => listSpecies(), []);
  const { data: photos } = useLiveQuery(() => listPhotosForTank(id), [id]);
  const { data: journalEntries } = useLiveQuery(() => listLogEntriesForTank(id), [id]);
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

  if (!tank) return <Screen>Loading...</Screen>;

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
      setAddPhotoError("Couldn't upload that photo — check your connection and try again.");
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
  const dateLabel = `Created ${formatDate(setupDate)}`;
  const waterBadge = tank.waterType === "brackish" ? { label: "Brackish", color: "var(--color-deep)" } : { label: "Freshwater", color: "var(--color-improve)" };

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

  return (
    <Screen>
      {unlockToast && <DexUnlockToast speciesName={unlockToast} onDismiss={() => setUnlockToast(null)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
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
            aria-label="More actions"
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
                  Edit Tank
                </button>
                <button
                  onClick={handleHide}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--color-ink)", fontSize: "var(--font-body-sm-size)" }}
                >
                  Hide
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--color-fix-now)", fontSize: "var(--font-body-sm-size)" }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <h1 style={{ fontSize: "var(--font-title-size)", margin: 0, lineHeight: 1.15 }}>{tank.name}</h1>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: waterBadge.color,
              color: "#fff",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: "var(--font-caption-size)",
              fontWeight: 600,
            }}
          >
            {waterBadge.label}
          </span>
        </div>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
          {dateLabel}
          {tank.isPlanted && (
            <>
              <span aria-hidden>·</span>
              Planted
            </>
          )}
        </p>
        <p style={{ margin: "6px 0 0", display: "flex", alignItems: "center", gap: 6, fontSize: "var(--font-caption-size)", fontWeight: 600, color: "var(--color-improve)" }}>
          <span aria-hidden>●</span>
          Healthy
        </p>
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
            {addingPhoto ? "Adding photo..." : "Add a photo of your tank"}
          </p>
          <PhotoPickerButton label={addingPhoto ? "Adding..." : "Add a photo"} onPick={handleAddPhoto} />
          {addPhotoError && (
            <p style={{ margin: 0, fontSize: "var(--font-caption-size)", color: "var(--color-fix-now)" }}>{addPhotoError}</p>
          )}
        </div>
      )}

      <AboutSection tank={tank} recommendedTempC={recommendedTempC} />

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
            <strong style={{ fontSize: "var(--font-body-sm-size)" }}>Health Check</strong>
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
              Expert analysis — just upload a new picture
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
          aria-label="Delete tank"
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
            <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 6 }}>Delete tank?</p>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 20 }}>
              This permanently deletes {tank.name} and everything logged under it. This can&apos;t be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryButton onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                No
              </SecondaryButton>
              <DangerButton onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, delete"}
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
        label="Fish"
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
            <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>No fish added yet</span>
          )
        }
      />

      {livestockExpanded && (
        <div style={sectionBodyStyle}>
          <div style={{ paddingTop: 8, paddingBottom: 4 }}>
            <SecondaryButton onClick={() => setShowAddPopup(true)}>⊕ Add fish</SecondaryButton>
          </div>
          {aliveLivestock.length === 0 && (
            <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", padding: "6px 0" }}>No fish added yet.</p>
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
          aria-label="Add fish"
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
            <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 16 }}>Add a fish</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PrimaryButton onClick={() => router.push(`/tank/${id}/livestock/search`)}>🔍 Search by name</PrimaryButton>
              <PhotoPickerButton
                label="📷 Take a pic"
                onPick={(file) => {
                  setPendingLivestockScanFile(file);
                  setShowAddPopup(false);
                  router.push(`/tank/${id}/livestock/scan`);
                }}
              />
            </div>
            <div style={{ height: 10 }} />
            <SecondaryButton onClick={() => setShowAddPopup(false)}>Cancel</SecondaryButton>
          </div>
        </div>
      )}

      <CollapsedSectionCard
        label="Gallery"
        onToggle={() => setGalleryExpanded((v) => !v)}
        onAdd={() => setGalleryExpanded(true)}
        expanded={galleryExpanded}
        preview={
          <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
            {(photos ?? []).length > 0 ? `${(photos ?? []).length} photos` : "No photos yet"}
          </span>
        }
      />
      {galleryExpanded && (
        <div style={sectionBodyStyle}>
          <GalleryPanel tankId={id} />
        </div>
      )}

      <CollapsedSectionCard
        label="Journal"
        onToggle={() => setJournalExpanded((v) => !v)}
        onAdd={() => {
          setJournalExpanded(true);
          setJournalAutoOpenNew(true);
        }}
        expanded={journalExpanded}
        preview={
          <span style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)" }}>
            {(journalEntries ?? []).length > 0 ? `${(journalEntries ?? []).length} entries` : "No entries yet"}
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

/** Tank specs at a glance, right under the hero photo — size, water type, and the safe temperature overlap of whatever's actually living in the tank right now. */
function AboutSection({
  tank,
  recommendedTempC,
}: {
  tank: { lengthCm: number; widthCm: number; heightCm: number; volumeL: number };
  recommendedTempC: { min: number; max: number } | null;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Size", value: `${tank.lengthCm} × ${tank.widthCm} × ${tank.heightCm} cm` },
    { label: "Volume", value: `${tank.volumeL} L` },
    { label: "Temp", value: recommendedTempC ? `${recommendedTempC.min}–${recommendedTempC.max}°C` : "Add fish for a range" },
  ];

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
      {rows.map((r, i) => (
        <div key={r.label} style={{ paddingLeft: i === 0 ? 0 : 16, borderLeft: i === 0 ? "none" : "1px solid var(--color-line)" }}>
          <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: 0 }}>{r.label}</p>
          <p style={{ fontWeight: 600, fontSize: "var(--font-caption-size)", margin: "1px 0 0", whiteSpace: "nowrap" }}>{r.value}</p>
        </div>
      ))}
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
              <span aria-hidden>⊕</span> Add
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
              <span aria-hidden>⊕</span> Add
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

/** One row in the inline (expand-in-place, no navigation) livestock list — exactly what Jaideep asked for: photo, name, added date, an editable count, and a bin icon. Nothing else. */
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
          {firstName(species?.commonNames) ?? livestock.speciesId} {isAiGenerated(species) && <Chip variant="unverified">AI</Chip>}
        </strong>
        <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--font-caption-size)", margin: "1px 0 0" }}>
          Added {new Date(livestock.addedOn).toLocaleDateString()}
        </p>
      </div>

      {confirmingDelete ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: "var(--font-caption-size)", color: "var(--color-ink-muted)" }}>Remove?</span>
          <button
            type="button"
            onClick={onConfirmDelete}
            style={{ background: "var(--color-fix-now)", color: "#fff", border: "none", borderRadius: "var(--radius-sm, 6px)", padding: "4px 8px", fontSize: "var(--font-caption-size)", fontWeight: 700, cursor: "pointer" }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            style={{ background: "none", border: "1px solid var(--color-line)", borderRadius: "var(--radius-sm, 6px)", padding: "4px 8px", fontSize: "var(--font-caption-size)", cursor: "pointer" }}
          >
            No
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
            aria-label="Remove fish"
            style={{ flexShrink: 0, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--color-fix-now)", fontSize: 18, cursor: "pointer" }}
          >
            🗑️
          </button>
        </>
      )}
    </div>
  );
}

