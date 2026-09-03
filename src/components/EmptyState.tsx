import styles from "./EmptyState.module.css";
import { PrimaryButton } from "./Button";

/** Illustration, one line of explanation, one action. */
export function EmptyState({
  icon = "🐟",
  message,
  actionLabel,
  onAction,
}: {
  icon?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <p className={styles.message}>{message}</p>
      {actionLabel && onAction ? (
        <PrimaryButton className={styles.action} onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      ) : null}
    </div>
  );
}
