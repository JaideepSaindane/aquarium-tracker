"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Banner } from "@/components/Banner";
import { TankThumbnail } from "@/components/TankThumbnail";
import { SpeciesThumb } from "@/components/SpeciesThumb";
import { PrimaryButton, SecondaryButton, DangerButton } from "@/components/Button";
import { ListRow } from "@/components/ListRow";
import { FirstTankTour } from "@/components/FirstTankTour";
import { FeedbackModal } from "@/components/FeedbackModal";
import { HomeInstallPrompt } from "@/components/HomeInstallPrompt";
import { useLiveQuery, notifyChanged } from "@/db/live";
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

// One shared, gently tinted look for the three primary entry points (Help me
// build a tank, Add tank, Fish Doctor) — more prominent than a plain card,
// less loud than a solid fill (Jaideep, 2026-09-15).
const PRIMARY_TINT = {
  background: "color-mix(in srgb, var(--soft-accent) 12%, var(--soft-card-bg))",
  border: "1px solid color-mix(in srgb, var(--soft-accent) 35%, transparent)",
} as const;

/** A round icon in a tinted circle — the shared visual unit behind the action tiles, stat pills, and the Need Help card, so the whole page reads as one consistent icon language instead of ad hoc emoji sizes. */
function IconBadge({ icon, size = 44, tone = "soft" }: { icon: ReactNode; size?: number; tone?: "soft" | "solid" | "accent" }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        background: tone === "solid" ? "rgba(255,255,255,0.22)" : tone === "accent" ? "var(--soft-accent)" : "var(--soft-accent-soft)",
        color: tone === "solid" || tone === "accent" ? "#fff" : "var(--soft-accent)",
      }}
    >
      {icon}
    </span>
  );
}

/** A big, tappable primary-action tile — icon badge, bold label, short caption underneath. Replaces a plain pill button so the two top-level actions read as real destinations, not just buttons in a row. */
function ActionTile({ icon, label, caption, onClick }: { icon: string; label: string; caption: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        padding: "16px 14px",
        textAlign: "left",
        borderRadius: "var(--radius-lg)",
        ...PRIMARY_TINT,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <IconBadge icon={icon} tone="accent" />
      <span>
        <span style={{ display: "block", fontWeight: 700, fontSize: "var(--font-body-sm-size)", color: "var(--soft-ink)" }}>
          {label}
        </span>
        <span style={{ display: "block", fontSize: "var(--font-caption-size)", marginTop: 2, color: "var(--soft-ink-muted)" }}>
          {caption}
        </span>
      </span>
    </button>
  );
}

// Tanks list — the app's home screen.
//
// Fully rethought 2026-09-14 (Jaideep: "rethink a more user-friendly design
// of this entire page... move stuff around as much as you want... purely
// making it absolutely stunning to look at, plus very user-friendly").
// Kept strictly inside the app's existing "soft" design tokens (no new
// colours introduced) — the navy/blue palette was a deliberate reskin
// Jaideep approved earlier the same day this session started, so this pass
// is a structure/hierarchy rework, not a new visual identity. Changes from
// the previous layout:
//   - A quiet stat strip ("N Tanks · N Fish") under the greeting — a real,
//     honest fact, not a gamified streak (Principle 6).
//   - The two pinned actions (Help me build a tank / Add Tank) are now big
//     icon tiles instead of plain pill buttons, so they read as real
//     destinations.
//   - "My Tanks" keeps its own tinted section block, now with the search
//     box living inside it (was floating above, disconnected from the
//     list it searches).
//   - The empty state is centered with a real icon badge instead of just
//     stacked text + a button.
//   - The "Need help?" card is now one shared block rendered once instead
//     of duplicated between the empty and populated states, wrapped in its
//     own card so it matches every other section's visual weight instead
//     of sitting as a bare row.
export default function TanksPage() {
  const router = useRouter();
  const { data, loading, error } = useLiveQuery(loadHomeData, []);
  const tanks = data?.tanks;
  const t = useTranslation();
  const [query, setQuery] = useState("");
  const [openMenuTankId, setOpenMenuTankId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const filteredTanks = (tanks ?? [])
    .filter((tank) => tank.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      return b.createdAt.localeCompare(a.createdAt);
    });
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-caption-size)", marginBottom: 2 }}>{t.home.welcome},</p>
          <h1 style={{ fontSize: "var(--font-title-size)", fontWeight: 800, color: "var(--soft-ink)" }}>
            {data?.profileName ? data.profileName : t.home.aquarist} 👋
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            aria-label={t.feedback.giveFeedback}
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
            }}
          >
            💬
          </button>
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
            }}
          >
            ⚙️
          </Link>
        </div>
      </div>

      {/* Pinned primary actions (2026-09-14, Jaideep: "move these buttons
          to the top, and we'll pin them there so that these become primary
          actions... put Help me build a tank as the first button, and
          after that, Add a tank... remove the Ask Aqua option" — Ask lives
          as its own bottom-nav tab already, so it was redundant here). */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <ActionTile
          icon="🧭"
          label={t.home.plannerCta}
          caption={t.home.plannerCaption}
          onClick={() => router.push("/onboarding/planner")}
        />
        <ActionTile icon="＋" label={t.home.addTank} caption={t.home.addTankCaption} onClick={() => router.push("/tank/new")} />
      </div>

      {/* Fish Doctor sits right under the two primary action tiles (Jaideep,
          2026-09-15) — always visible, not pushed below the tank list. */}
      <div
        style={{
          borderRadius: "var(--radius-lg)",
          ...PRIMARY_TINT,
          boxShadow: "var(--shadow-sm)",
          padding: "4px 14px",
          marginBottom: 24,
        }}
      >
        <ListRow
          icon={<IconBadge icon="🩺" size={32} tone="accent" />}
          label={t.home.needHelpTitle}
          meta={t.home.needHelpBody}
          trailing={t.home.getHelp}
          showChevron
          onClick={() => router.push("/emergency")}
        />
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

      {!loading && tanks && tanks.length === 0 && (
        <div style={{ textAlign: "center", padding: "28px 12px 8px" }}>
          <div
            style={{
              width: 84,
              height: 84,
              margin: "0 auto 16px",
              borderRadius: "50%",
              background: "var(--soft-accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
            }}
            aria-hidden
          >
            🐠
          </div>
          <p style={{ fontWeight: 800, fontSize: "var(--font-heading-size)", color: "var(--soft-ink)", marginBottom: 6 }}>{t.home.emptyHeading}</p>
          <p style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-body-sm-size)", marginBottom: 20, maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>
            {t.home.emptySubtext}
          </p>
          <div style={{ maxWidth: 280, margin: "0 auto 24px" }}>
            <PrimaryButton onClick={() => router.push("/onboarding/scan")}>🐟 {t.home.haveTankCta}</PrimaryButton>
          </div>
        </div>
      )}

      {tanks && tanks.length > 0 && (
        <>
          {/* "My Tanks" (2026-09-14, matched to a reference screenshot
              Jaideep shared): a plain header directly on the page
              background — each tank card is its own highlighted block
              (photo with a dark bottom gradient so the name/date stay
              legible right on top of it, exactly what Jaideep called out:
              "I especially love that the tank image has black edges
              [gradient] so that the text is visible"), not one big tinted
              container wrapping the whole list. */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <p style={{ fontWeight: 800, color: "var(--soft-ink)", fontSize: "var(--font-body-size)" }}>{t.home.myTanks}</p>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: "var(--radius-pill)",
                background: "var(--soft-card-bg)",
                border: "1px solid var(--soft-card-border)",
                color: "var(--soft-ink-muted)",
                fontSize: "var(--font-caption-size)",
                fontWeight: 700,
              }}
            >
              {tanks.length}
            </span>
          </div>

          {/* A search box is dead weight when every tank already fits on
              screen at a glance — only earns its place once there's
              enough to actually search through. Jaideep's ask,
              2026-09-10. */}
          {tanks.length >= 4 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.home.searchPlaceholder}
              style={{
                width: "100%",
                height: 44,
                padding: "0 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-line)",
                background: "var(--color-surface)",
                color: "var(--soft-ink)",
                fontSize: "var(--font-body-size)",
                marginBottom: 14,
                boxSizing: "border-box",
              }}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
            {filteredTanks.map((tank) => {
              const livestockThumbs = data?.livestockByTank.get(tank.id) ?? [];
              const visibleThumbs = livestockThumbs.slice(0, 4);
              const overflowCount = livestockThumbs.length - visibleThumbs.length;
              const isBrackish = tank.waterType === "brackish";
              // Setup-type label (2026-09-14, Jaideep: "just like we have
              // the freshwater tank tag, we should also have a planted
              // versus hardscape-only versus bare-bottom tag") — always
              // shows one of the three now, not just "Planted" when true
              // and silence otherwise. Falls back to the old isPlanted
              // boolean for a tank saved before setupType existed.
              const setupType = tank.setupType ?? (tank.isPlanted ? "planted" : null);
              const setupLabel =
                setupType === "planted"
                  ? t.home.planted
                  : setupType === "hardscape"
                    ? t.plannerPage.hardscapeOption
                    : setupType === "bare_bottom"
                      ? t.plannerPage.bareBottomOption
                      : null;
              // Real, honest count — not a deep health analysis (that's
              // Section 4/Tank Detail's job, computed from actual logged
              // parameters). Here it's just "does this tank have fish or
              // not," which is the one fact this list screen actually has
              // on hand — never assert "Healthy" with nothing behind it
              // (brief Part 1 §11's own named example). The status pill
              // overlaid on the photo below is deliberately paired with
              // the real "{n} fish" figure spelled out in the footer row,
              // not hidden behind a tap — same honesty rule, different
              // layout.
              const fishTotal = livestockThumbs.reduce((sum, l) => sum + l.count, 0);
              const healthy = fishTotal > 0;

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
                  <Link href={`/tank/${tank.id}`} style={{ display: "block", position: "relative" }}>
                    <TankThumbnail photoUri={tank.photoUri} width="100%" height={190} radius="0" />

                    {/* Dark fade so white text stays legible over any photo. */}
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.28) 42%, rgba(0,0,0,0) 68%)",
                      }}
                    />

                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: "var(--radius-pill)",
                        background: "rgba(0,0,0,0.45)",
                        backdropFilter: "blur(6px)",
                        WebkitBackdropFilter: "blur(6px)",
                        color: "#fff",
                        fontSize: "var(--font-caption-size)",
                        fontWeight: 700,
                      }}
                    >
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: healthy ? "var(--color-improve)" : "var(--color-ink-faint, #9aa)" }} />
                      {healthy ? t.home.statusOk : t.home.statusNoFish}
                    </span>

                    <div style={{ position: "absolute", left: 14, right: 54, bottom: 12 }}>
                      <strong style={{ display: "block", color: "#fff", fontSize: "var(--font-heading-size)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tank.name}
                      </strong>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: "rgba(255,255,255,0.85)",
                          fontSize: "var(--font-caption-size)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isBrackish ? t.home.brackish : t.home.freshwater}
                        {setupLabel && (
                          <>
                            <span aria-hidden>·</span>
                            {setupLabel}
                          </>
                        )}
                        {tank.hasCo2 ? " · CO₂" : ""}
                        {" · "}
                        {new Date(tank.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={() => setOpenMenuTankId((cur) => (cur === tank.id ? null : tank.id))}
                    aria-label={`More actions for ${tank.name}`}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.45)",
                      backdropFilter: "blur(6px)",
                      WebkitBackdropFilter: "blur(6px)",
                      color: "#fff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                    }}
                  >
                    {/* The single "⋮" glyph read as an unlabeled blob at this
                        size in some fonts (Jaideep: "the white bubble on tank
                        images doesn't convey what it does") — three explicit
                        dots render reliably as a "more actions" affordance
                        regardless of font. */}
                    {[0, 1, 2].map((i) => (
                      <span key={i} aria-hidden style={{ width: 3, height: 3, borderRadius: "50%", background: "#fff" }} />
                    ))}
                  </button>

                  <Link
                    href={`/tank/${tank.id}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", color: "inherit" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      {visibleThumbs.length > 0 && (
                        <div style={{ display: "flex", gap: 4 }}>
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
                        </div>
                      )}
                      <span style={{ color: "var(--soft-ink-muted)", fontSize: "var(--font-body-sm-size)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {fishTotal > 0 ? t.home.fishCount.replace("{n}", String(fishTotal)) : t.home.noFishYet}
                      </span>
                    </div>
                    <span style={{ display: "flex", alignItems: "center", gap: 2, color: "var(--soft-accent)", fontSize: "var(--font-body-sm-size)", fontWeight: 700, flexShrink: 0 }}>
                      {t.common.view}
                      <span aria-hidden>›</span>
                    </span>
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
                          top: 46,
                          right: 10,
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

      {feedbackOpen && <FeedbackModal source="home" onClose={() => setFeedbackOpen(false)} />}
      <HomeInstallPrompt />
    </Screen>
  );
}
