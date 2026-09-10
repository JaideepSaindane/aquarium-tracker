"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { TankThumbnail } from "@/components/TankThumbnail";
import { TankHeroPhoto } from "@/components/TankHeroPhoto";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { AquaIcon } from "@/components/icons/AquaIcon";
import { SecondaryButton, DangerButton } from "@/components/Button";
import { FirstTankTour } from "@/components/FirstTankTour";
import { useLiveQuery } from "@/db/live";
import { listTanks, updateTank, deleteTank } from "@/db/queries/tanks";
import { listAllAliveLivestock } from "@/db/queries/livestock";
import { listSpecies } from "@/db/queries/species";
import { getProfile } from "@/db/queries/profile";
import { useTranslation } from "@/i18n/use-translation";

type TankLivestockThumb = { speciesId: string; count: number; imageUri?: string | null; category?: string | null };

async function loadHomeData() {
  const [allTanks, livestock, species, profile] = await Promise.all([listTanks(), listAllAliveLivestock(), listSpecies(), getProfile()]);
  // "Hide Tank" (Edit Tank screen) sets status to archived — hidden from
  // this list but not deleted, so it's still in exports and can be
  // recovered by editing status back. Only a real Delete removes a tank.
  const tanks = allTanks.filter((t) => t.status !== "archived");
  const speciesById = new Map(species.map((s) => [s.id, s]));

  const livestockByTank = new Map<string, TankLivestockThumb[]>();
  for (const row of livestock) {
    const sp = speciesById.get(row.speciesId);
    const list = livestockByTank.get(row.tankId) ?? [];
    list.push({ speciesId: row.speciesId, count: row.count, imageUri: sp?.imageUri, category: sp?.category });
    livestockByTank.set(row.tankId, list);
  }

  return { tanks, livestockByTank, profileName: profile?.name };
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Tanks list — the app's home screen. Restyled 2026-09-04 to match a
// reference screenshot Jaideep shared: hero + greeting + search/filter row,
// and tank cards redesigned with a bigger photo, water-type icon, Planted/CO2
// pills, creation date, per-fish circular thumbnails, and a per-card "⋮"
// quick-actions menu (Edit/Hide/Delete). Bottom nav and the name-based
// greeting were deliberately kept as-is — Jaideep's call when asked, over
// switching to the mockup's own nav/persona-title styling. The reminders
// feature (task-due card/chip) was removed 2026-09-10 — reminders are gone
// app-wide, so every tank now just shows a plain "Healthy" badge.
export default function TanksPage() {
  const router = useRouter();
  const { data, loading } = useLiveQuery(loadHomeData, []);
  const tanks = data?.tanks;
  const t = useTranslation();
  const [query, setQuery] = useState("");
  const [openMenuTankId, setOpenMenuTankId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredTanks = (tanks ?? [])
    .filter((tank) => tank.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      return b.createdAt.localeCompare(a.createdAt);
    });
  const mostRecentPhotoTank = (tanks ?? [])
    .filter((t) => t.photoUri)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const deleteTarget = (tanks ?? []).find((t) => t.id === deleteTargetId);

  async function handleHide(tankId: string) {
    setOpenMenuTankId(null);
    await updateTank(tankId, { status: "archived" });
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    setDeleting(true);
    await deleteTank(deleteTargetId);
    setDeleting(false);
    setDeleteTargetId(null);
  }

  return (
    <Screen background="var(--soft-bg)">
      <TankHeroPhoto photoUri={mostRecentPhotoTank?.photoUri}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "var(--font-body-sm-size)", marginBottom: 2 }}>{greeting()},</p>
            <h1 style={{ fontSize: "var(--font-title-size)", color: "#fff" }}>
              {data?.profileName ? data.profileName : "Aquarist"} 👋
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Link
              href="/settings"
              aria-label="Settings"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.28)",
                backdropFilter: "blur(var(--glass-blur))",
                WebkitBackdropFilter: "blur(var(--glass-blur))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
                color: "#fff",
              }}
            >
              ⚙️
            </Link>
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "var(--font-body-sm-size)", marginTop: 12 }}>
          {tanks && tanks.length > 0 ? "Your aquariums are looking good." : "Let's get your first tank set up."}
        </p>
      </TankHeroPhoto>

      {/* A search box is dead weight when every tank already fits on screen
          at a glance — only earns its place once there's enough to actually
          search through. Jaideep's ask, 2026-09-10. */}
      {tanks && tanks.length >= 4 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="⌕  Search your tanks"
          style={{
            width: "100%",
            height: 48,
            padding: "0 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-line)",
            background: "var(--color-surface)",
            color: "var(--soft-ink)",
            fontSize: "var(--font-body-size)",
            marginBottom: 20,
            boxSizing: "border-box",
          }}
        />
      )}

      {!loading && tanks && tanks.length === 0 && (
        <>
          <p style={{ fontWeight: 700, fontSize: "var(--font-heading-size)", color: "var(--soft-ink)", textAlign: "center", marginBottom: 20 }}>
            {t.home.emptyHeading}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <Link
              href="/onboarding/scan"
              style={{
                display: "block",
                textAlign: "center",
                padding: "16px 20px",
                borderRadius: "var(--radius-lg)",
                background: "var(--soft-accent)",
                color: "#fff",
                fontWeight: 700,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              🐟 {t.home.haveTankCta}
            </Link>
            <Link
              href="/onboarding/planner"
              style={{
                display: "block",
                textAlign: "center",
                padding: "16px 20px",
                borderRadius: "var(--radius-lg)",
                background: "var(--soft-card-bg)",
                border: "1px solid var(--soft-card-border)",
                color: "var(--soft-ink)",
                fontWeight: 700,
              }}
            >
              🧭 {t.home.plannerCta}
            </Link>
          </div>
          <Link href="/emergency" style={{ display: "block", textAlign: "center", color: "var(--color-fix-now)" }}>
            {t.home.emergencyLink}
          </Link>
        </>
      )}

      {tanks && tanks.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, position: "relative" }}>
            <p style={{ fontWeight: 700, color: "var(--soft-ink)" }}>
              My tanks <span style={{ color: "var(--soft-ink-muted)", fontWeight: 600 }}>{tanks.length}</span>
            </p>
            <Link
              href="/tank/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: "var(--radius-pill)",
                background: "var(--soft-accent)",
                color: "#fff",
                fontSize: "var(--font-caption-size)",
                fontWeight: 700,
                boxShadow: "var(--shadow-sm)",
                flexShrink: 0,
              }}
            >
              + Add tank
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {filteredTanks.map((tank) => {
              const livestockThumbs = data?.livestockByTank.get(tank.id) ?? [];
              const visibleThumbs = livestockThumbs.slice(0, 4);
              const overflowCount = livestockThumbs.length - visibleThumbs.length;
              const isBrackish = tank.waterType === "brackish";

              return (
                <div
                  key={tank.id}
                  style={{
                    position: "relative",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    boxShadow: "var(--shadow-sm)",
                    overflow: "hidden",
                  }}
                >
                  <Link href={`/tank/${tank.id}`} style={{ display: "block" }}>
                    <TankThumbnail photoUri={tank.photoUri} width="100%" height={140} radius="0" />
                  </Link>

                  <button
                    onClick={() => setOpenMenuTankId((cur) => (cur === tank.id ? null : tank.id))}
                    aria-label={`More actions for ${tank.name}`}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(255,255,255,0.85)",
                      color: "var(--color-ink)",
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ⋮
                  </button>

                  <Link href={`/tank/${tank.id}`} style={{ display: "block", padding: 12, color: "inherit" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ color: "var(--soft-ink)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tank.name}</strong>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "var(--font-caption-size)",
                          fontWeight: 600,
                          padding: "2px 10px",
                          borderRadius: "var(--radius-pill)",
                          color: "var(--color-improve)",
                          background: "var(--color-deep-soft)",
                          flexShrink: 0,
                        }}
                      >
                        ● Healthy
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "var(--soft-ink-muted)",
                        fontSize: "var(--font-caption-size)",
                        margin: "4px 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <AquaIcon name={isBrackish ? "brackish" : "freshwater"} size={13} />
                      {isBrackish ? "Brackish" : "Freshwater"}
                      {tank.isPlanted && (
                        <>
                          <span aria-hidden>·</span>
                          <AquaIcon name="planted" size={13} />
                          Planted
                        </>
                      )}
                      {tank.hasCo2 ? " · CO₂" : ""}
                      {" · "}
                      {new Date(tank.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </div>

                    <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                      {visibleThumbs.map((l, i) => (
                        <SpeciesThumb key={`${l.speciesId}-${i}`} imageUri={l.imageUri} category={l.category} size={24} />
                      ))}
                      {overflowCount > 0 && (
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "var(--soft-bg-alt)",
                            color: "var(--soft-ink-muted)",
                            fontSize: 10,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          +{overflowCount}
                        </span>
                      )}
                      {visibleThumbs.length === 0 && (
                        <span style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)" }}>No fish yet</span>
                      )}
                    </div>
                  </Link>

                  {openMenuTankId === tank.id && (
                    <>
                      <div
                        onClick={() => setOpenMenuTankId(null)}
                        style={{ position: "fixed", inset: 0, zIndex: 29 }}
                        aria-hidden
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 38,
                          right: 8,
                          zIndex: 30,
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-line)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,0.15))",
                          overflow: "hidden",
                          minWidth: 140,
                        }}
                      >
                        <button
                          onClick={() => {
                            setOpenMenuTankId(null);
                            router.push(`/tank/${tank.id}/edit`);
                          }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--soft-ink)", fontSize: "var(--font-body-sm-size)" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleHide(tank.id)}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--soft-ink)", fontSize: "var(--font-body-sm-size)" }}
                        >
                          Hide
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuTankId(null);
                            setDeleteTargetId(tank.id);
                          }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--color-fix-now)", fontSize: "var(--font-body-sm-size)" }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {filteredTanks.length === 0 && (
              <p style={{ color: "var(--soft-ink-muted)", textAlign: "center", padding: "16px 0" }}>No tanks match your search.</p>
            )}
          </div>

          <Link href="/onboarding/planner" style={{ display: "block", textAlign: "center", color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 8 }}>
            🧭 {t.home.plannerCta}
          </Link>
          <Link href="/emergency" style={{ display: "block", textAlign: "center", color: "var(--color-fix-now)" }}>
            {t.home.emergencyLink}
          </Link>
        </>
      )}

      {deleteTarget && (
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
          onClick={() => !deleting && setDeleteTargetId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 340,
              background: "var(--soft-bg)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              textAlign: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 6, color: "var(--soft-ink)" }}>Delete tank?</p>
            <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 20 }}>
              This permanently deletes {deleteTarget.name} and everything logged under it. This can&apos;t be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryButton onClick={() => setDeleteTargetId(null)} disabled={deleting}>
                No
              </SecondaryButton>
              <DangerButton onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, delete"}
              </DangerButton>
            </div>
          </div>
        </div>
      )}

      <FirstTankTour hasTanks={(tanks?.length ?? 0) > 0} />
    </Screen>
  );
}
