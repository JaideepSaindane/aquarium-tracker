import styles from "./SegmentedControl.module.css";

/**
 * A pill-shaped multi-option toggle — Section 2 primitive. The redesign
 * audit found this exact pattern re-implemented inline on at least five
 * screens (tank/new and tank/[id]/size's cm/ft toggle, tank/[id]/log's
 * method selector, onboarding/scan's unit toggle, tank/[id]/edit's
 * water-type buttons), each with its own hardcoded `#fff` active text,
 * ~2px vertical padding (a sub-44px tap target), and a teal active fill.
 * One shared component fixes all of them at once: solid aqua fill for the
 * active segment (matching the Button primary tier), ≥44px total height,
 * and a real `--color-ink` (not hardcoded white) inactive/active text
 * pairing that already works in both themes via tokens.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.track} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`${styles.segment} ${opt.value === value ? styles.active : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
