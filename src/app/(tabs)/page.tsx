"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Banner } from "@/components/Banner";
import { TankThumbnail } from "@/components/TankThumbnail";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { ListRow } from "@/components/ListRow";
import { FirstTankTour } from "@/components/FirstTankTour";
import { useLiveQuery, notifyChanged } from "@/db/live";
import { listTanks, updateTank, deleteTank } from "@/db/queries/tanks";
import { listAllAliveLivestock } from "@/db/queries/livestock";
import { listSpecies } from "@/db/queries/species";
import { getProfile } from "@/db/queries/profile";
import { formatVolumeDual } from "@/lib/units";
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

// Tanks list — the app's home screen. Restyled 2026-09-04 to match a
// reference screenshot Jaideep shared: hero + greeting + search/filter row,
// and tank cards redesigned with a bigger photo, water-type icon, Planted/CO2
// pills, creation date, per-fish circular thumbnails, and a per-card "⋮"
// quick-actions menu (Edit/Hide/Delete). The reminders feature (task-due
// card/chip) was removed 2026-09-10 — reminders are gone app-wide, so every
// tank now just shows a plain "Healthy" badge.
//
// Restyled again 2026-09-13 against a second reference mockup Jaideep
// shared (a fintech dashboard: dark gradient "card" widget, a send-action +
// stat pill row, then a rounded white panel holding a compact transaction
// list). Translated structurally, not literally — this is a fish-tank
// tracker, not a bank app, so "Physical Card" becomes the most recently
// added tank as a featured hero, "Send" becomes "Scan" (the app's actual
// primary action), and the transaction list becomes the same tank list as
// before, condensed into compact rows inside one panel instead of separate
// photo-led cards. Colours stay the app's own token system (one aqua brand
// colour, reserved for active/primary states) rather than the mockup's navy
// palette — see tokens.css's new --hero-gradient-* pair for the one
// deliberate exception (a permanently-dark card, by design, regardless of
// theme). The bottom nav itself was restyled in TabBar.tsx per the same ask.
export default function TanksPage() {
  const router = useRouter();
  const { data, loading, error } = useLiveQuery(loadHomeData, []);
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
  const deleteTarget = (tanks ?? []).find((t) => t.id === deleteTargetId);

  // The hero card always features the most recently added tank, independent
  // of the search box above (which only filters the list panel below it).
  const featuredTank = (tanks ?? []).length > 0 ? [...(tanks ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : null;
  const featuredFishTotal = featuredTank ? (data?.livestockByTank.get(featuredTank.id) ?? []).reduce((sum, l) => sum + l.count, 0) : 0;
  const totalFishAcrossTanks = (tanks ?? []).reduce((sum, tank) => sum + (data?.livestockByTank.get(tank.id) ?? []).reduce((s, l) => s + l.count, 0), 0);

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
      {/* Redesign Section 3 (brief Screen 1): the greeting used to sit
          overlaid on a full-bleed blurred tank photo — the brief calls this
          out directly ("the greeting and background image compete with one
          another"). The greeting is now small, plain text; the tank itself
          (its own real photo, in its own card below) is the hero, not a
          backdrop for the header. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 2 }}>{t.home.welcome},</p>
          <h1 style={{ fontSize: "var(--font-heading-size)", color: "var(--soft-ink)" }}>
            {data?.profileName ? data.profileName : t.home.aquarist} 👋
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label={t.tabs.settings}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--soft-card-bg)",
            border: "1px solid var(--soft-card-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ⚙️
        </Link>
      </div>

      {/* Real bug fix, 2026-09-13 (Jaideep: "I signed in... the page is
          stuck and I dont see anything") — a failed load (most often a
          transient 401 right after sign-in, before the session cookie is
          fully live server-side) used to leave this screen permanently
          blank with no error and nothing to tap. useLiveQuery now retries
          once automatically and only surfaces this banner if that retry
          also fails, with a manual retry action. */}
      {error != null && !loading && (
        <div style={{ marginBottom: 16 }}>
          <Banner severity="fixNow">{t.home.couldntLoadTanks}</Banner>
          <div style={{ marginTop: 8 }}>
            <SecondaryButton onClick={() => notifyChanged()}>{t.home.tryAgain}</SecondaryButton>
          </div>
        </div>
      )}

      {/* Hero: the most recently added tank as a permanently-dark gradient
          card, plus a quick "Scan" action and a stat pill beside it — the
          2026-09-13 mockup's "Physical Card" + "Send" + Visa-pill row,
          translated to this app's own content. */}
      {featuredTank && (
        <div style={{ marginBottom: 20 }}>
          <Link
            href={`/tank/${featuredTank.id}`}
            style={{
              display: "block",
              borderRadius: "var(--radius-xl)",
              padding: 20,
              marginBottom: 12,
              background: `linear-gradient(135deg, var(--hero-gradient-start), var(--hero-gradient-end))`,
              color: "#fff",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <p style={{ fontSize: "var(--font-caption-size)", color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{t.home.featuredBadge}</p>
            <strong style={{ display: "block", fontSize: "var(--font-heading-size)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {featuredTank.name}
            </strong>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: "var(--font-display-size, 28px)", fontWeight: 700 }}>{formatVolumeDual(featuredTank.volumeL)}</span>
            </div>
            <p style={{ fontSize: "var(--font-body-sm-size)", color: "rgba(255,255,255,0.75)", marginTop: 8 }}>
              {featuredFishTotal > 0 ? t.home.statusOkExplanation.replace("{n}", String(featuredFishTotal)) : t.home.statusNoFishExplanation}
            </p>
            <span
              aria-hidden
              style={{
                position: "absolute",
                right: -10,
                bottom: -20,
                fontSize: 84,
                opacity: 0.12,
                lineHeight: 1,
              }}
            >
              🐠
            </span>
          </Link>

          <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
            <button
              onClick={() => router.push("/onboarding/scan")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: 76,
                flexShrink: 0,
                padding: "12px 0",
                borderRadius: "var(--radius-lg)",
                border: "none",
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--color-deep)",
                  color: "var(--color-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                ↗
              </span>
              <span style={{ fontSize: "var(--font-caption-size)", fontWeight: 600, color: "var(--soft-ink)" }}>{t.home.scanAction}</span>
            </button>

            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                borderRadius: "var(--radius-lg)",
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-sm)",
                color: "var(--soft-ink)",
                fontWeight: 600,
                fontSize: "var(--font-body-sm-size)",
              }}
            >
              {t.home.statsLine.replace("{tanks}", String(tanks?.length ?? 0)).replace("{fish}", String(totalFishAcrossTanks))}
            </div>
          </div>
        </div>
      )}

      {/* A search box is dead weight when every tank already fits on screen
          at a glance — only earns its place once there's enough to actually
          search through. Jaideep's ask, 2026-09-10. */}
      {tanks && tanks.length >= 4 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.home.searchPlaceholder}
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
            <PrimaryButton onClick={() => router.push("/onboarding/scan")}>🐟 {t.home.haveTankCta}</PrimaryButton>
            <SecondaryButton onClick={() => router.push("/onboarding/planner")}>🧭 {t.home.plannerCta}</SecondaryButton>
          </div>
          <ListRow
            icon="🩺"
            label={t.home.needHelpTitle}
            meta={t.home.needHelpBody}
            trailing={t.home.getHelp}
            showChevron
            onClick={() => router.push("/emergency")}
          />
        </>
      )}

      {tanks && tanks.length > 0 && (
        <>
          {/* The "Statistics" panel from the 2026-09-13 mockup — one rounded
              surface holding a compact row per tank, instead of the earlier
              stack of separate big-photo cards. Menu (Edit/Hide/Delete) and
              delete-confirm behaviour are unchanged, just triggered from a
              plain trailing "⋮" button instead of one floating over a photo. */}
          <div
            style={{
              borderRadius: "var(--radius-xl)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              boxShadow: "var(--shadow-sm)",
              padding: "16px 16px 4px",
              marginBottom: 20,
            }}
          >
            <p style={{ fontWeight: 700, color: "var(--soft-ink)", marginBottom: 4 }}>
              {t.home.myTanks} <span style={{ color: "var(--soft-ink-muted)", fontWeight: 600 }}>{tanks.length}</span>
            </p>

            {filteredTanks.map((tank, i) => {
              const livestockThumbs = data?.livestockByTank.get(tank.id) ?? [];
              const visibleThumbs = livestockThumbs.slice(0, 3);
              const overflowCount = livestockThumbs.length - visibleThumbs.length;
              const isBrackish = tank.waterType === "brackish";
              // Real, honest count — not a deep health analysis (that's
              // Section 4/Tank Detail's job, computed from actual logged
              // parameters). Here it's just "does this tank have fish or
              // not," which is the one fact this list screen actually has
              // on hand — never assert "Healthy" with nothing behind it
              // (brief Part 1 §11's own named example).
              const fishTotal = livestockThumbs.reduce((sum, l) => sum + l.count, 0);

              return (
                <div
                  key={tank.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--color-line-soft)",
                  }}
                >
                  <Link href={`/tank/${tank.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                    <TankThumbnail photoUri={tank.photoUri} size={48} radius="var(--radius-md)" />

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ display: "block", color: "var(--soft-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tank.name}
                      </strong>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: "var(--soft-ink-muted)",
                          fontSize: "var(--font-caption-size)",
                          margin: "2px 0 6px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isBrackish ? t.home.brackish : t.home.freshwater}
                        {tank.isPlanted && (
                          <>
                            <span aria-hidden>·</span>
                            {t.home.planted}
                          </>
                        )}
                        {tank.hasCo2 ? " · CO₂" : ""}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {visibleThumbs.map((l, ti) => (
                            <SpeciesThumb key={`${l.speciesId}-${ti}`} imageUri={l.imageUri} category={l.category} size={20} />
                          ))}
                          {overflowCount > 0 && (
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: "var(--soft-bg-alt)",
                                color: "var(--soft-ink-muted)",
                                fontSize: 9,
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
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "var(--font-caption-size)",
                        fontWeight: 700,
                        color: fishTotal > 0 ? "var(--color-improve)" : "var(--soft-ink-muted)",
                      }}
                    >
                      {fishTotal > 0 ? t.home.statusOk : t.home.statusNoFish}
                    </span>
                  </Link>

                  <button
                    onClick={() => setOpenMenuTankId((cur) => (cur === tank.id ? null : tank.id))}
                    aria-label={`More actions for ${tank.name}`}
                    style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "none",
                      background: "transparent",
                      color: "var(--soft-ink-muted)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                    }}
                  >
                    {[0, 1, 2].map((dotIndex) => (
                      <span key={dotIndex} aria-hidden style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor" }} />
                    ))}
                  </button>

                  {openMenuTankId === tank.id && (
                    <>
                      <div onClick={() => setOpenMenuTankId(null)} style={{ position: "fixed", inset: 0, zIndex: 29 }} aria-hidden />
                      <div
                        style={{
                          position: "absolute",
                          top: 42,
                          right: 0,
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
                          {t.common.edit}
                        </button>
                        <button
                          onClick={() => handleHide(tank.id)}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--soft-ink)", fontSize: "var(--font-body-sm-size)" }}
                        >
                          {t.home.hide}
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuTankId(null);
                            setDeleteTargetId(tank.id);
                          }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", color: "var(--color-fix-now)", fontSize: "var(--font-body-sm-size)" }}
                        >
                          {t.common.remove}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {filteredTanks.length === 0 && (
              <p style={{ color: "var(--soft-ink-muted)", textAlign: "center", padding: "16px 0" }}>{t.home.noTanksMatch}</p>
            )}
          </div>

          {/* Brief Screen 1's "Actions" row — Add tank / Help me build a
              tank / Ask Aqua, one simple row underneath the tank list
              instead of a pill fighting for space next to the section
              header above. */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <SecondaryButton fullWidth={false} style={{ flex: 1 }} onClick={() => router.push("/tank/new")}>
              + {t.home.addTank}
            </SecondaryButton>
            <SecondaryButton fullWidth={false} style={{ flex: 1 }} onClick={() => router.push("/onboarding/planner")}>
              🧭 {t.home.plannerCta}
            </SecondaryButton>
            <SecondaryButton fullWidth={false} style={{ flex: 1 }} onClick={() => router.push("/ask")}>
              💬 {t.home.askAquaAction}
            </SecondaryButton>
          </div>

          {/* Brief Screen 1: "Emergency" no longer dominates the ordinary
              home experience — a quiet row, not a loud red full-width
              link. The urgent treatment stays inside /emergency itself. */}
          <ListRow
            icon="🩺"
            label={t.home.needHelpTitle}
            meta={t.home.needHelpBody}
            trailing={t.home.getHelp}
            showChevron
            onClick={() => router.push("/emergency")}
          />
        </>
      )}

      {deleteTarget && (
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
            <p style={{ fontWeight: 700, fontSize: "var(--font-body-size)", marginBottom: 6, color: "var(--soft-ink)" }}>{t.home.deleteTankQuestion}</p>
            <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 20 }}>
              {t.home.deleteTankBody.replace("{name}", deleteTarget.name)}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryButton onClick={() => setDeleteTargetId(null)} disabled={deleting}>
                {t.home.no}
              </SecondaryButton>
              <DangerButton onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? t.home.deleting : t.home.yesDelete}
              </DangerButton>
            </div>
          </div>
        </div>
      )}

      <FirstTankTour hasTanks={(tanks?.length ?? 0) > 0} />
    </Screen>
  );
}
