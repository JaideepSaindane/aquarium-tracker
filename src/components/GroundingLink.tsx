import styles from "./GroundingLink.module.css";

/**
 * "Based on: Neon tetra" — tappable, opens the species card or corpus entry
 * a finding cites. `onOpen` is wired up once species/corpus screens exist
 * (T-021 / T-004); until then this just renders the label.
 */
export function GroundingLink({ label, onOpen }: { label: string; onOpen?: () => void }) {
  return (
    <button type="button" className={styles.link} onClick={onOpen} disabled={!onOpen}>
      Based on: {label}
    </button>
  );
}
