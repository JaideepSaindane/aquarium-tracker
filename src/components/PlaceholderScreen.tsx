import { Screen } from "./Screen";
import { EmptyState } from "./EmptyState";

/** Shared shape for every route that has no real feature yet. Every T-010 placeholder uses this. */
export function PlaceholderScreen({ title, note }: { title: string; note?: string }) {
  return (
    <Screen>
      <EmptyState icon="🚧" message={note ?? `${title} — this screen isn't built yet.`} />
    </Screen>
  );
}
