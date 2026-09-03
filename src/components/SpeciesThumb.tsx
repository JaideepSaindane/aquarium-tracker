const CATEGORY_ICON: Record<string, string> = {
  fish: "🐟",
  shrimp: "🦐",
  snail: "🐌",
  crayfish: "🦞",
  plant: "🌿",
};

/** Tiny circular species photo for list rows (search results, ID candidates, the fish already in a tank) — falls back to a category emoji when there's no reference photo yet. */
export function SpeciesThumb({
  imageUri,
  category,
  size = 32,
}: {
  imageUri?: string | null;
  category?: string | null;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "var(--color-surface-alt)",
        flexShrink: 0,
      }}
    >
      {imageUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: size * 0.55 }} aria-hidden>
          {CATEGORY_ICON[category ?? ""] ?? "❓"}
        </span>
      )}
    </span>
  );
}
