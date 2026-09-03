import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "danger";

function Button({
  variant,
  className,
  ...rest
}: { variant: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={[styles.button, styles[variant], className].filter(Boolean).join(" ")} {...rest} />;
}

/** Full-width by default on mobile. The main call-to-action. */
export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="secondary" {...props} />;
}

/** For destructive actions only (delete livestock, remove a tank). */
export function DangerButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button variant="danger" {...props} />;
}
