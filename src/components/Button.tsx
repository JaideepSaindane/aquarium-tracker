import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "danger" | "tertiary";

/**
 * `fullWidth` defaults to true (the original behaviour every existing call
 * site already relies on) — pass `fullWidth={false}` for an inline/compact
 * action that shouldn't stretch to the container's width. Redesign brief
 * Part 1 §10: "not every action should be a giant pill" — the visual size
 * of a button should match the importance of the action, which a row of
 * always-full-width buttons couldn't express.
 */
function Button({
  variant,
  className,
  fullWidth = true,
  ...rest
}: { variant: Variant; fullWidth?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[styles.button, styles[variant], fullWidth ? undefined : styles.inline, className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

/** Full-width by default on mobile. The main call-to-action. */
export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }) {
  return <Button variant="secondary" {...props} />;
}

/** For destructive actions only (delete livestock, remove a tank). */
export function DangerButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }) {
  return <Button variant="danger" {...props} />;
}

/**
 * Text-only, no fill or border — the third button tier the redesign audit
 * flagged as missing (Section 2). For a low-emphasis action inside a row
 * or card ("Edit targets", "Translate", "Start over") that was previously
 * either a full PrimaryButton (too loud) or unstyled aqua text with no
 * real tap target (inaccessible). Always `fullWidth={false}` by default —
 * a text button that stretches edge-to-edge reads wrong — but still a
 * real ≥44px tap target via padding, not a shrunk hitbox.
 */
export function TextButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }) {
  return <Button variant="tertiary" fullWidth={false} {...props} />;
}
