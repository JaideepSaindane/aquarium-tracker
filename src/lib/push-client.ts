"use client";

// Web Push client — specs/T-018. Every function here is defensive about
// browser support because the constraints are real and platform-specific
// (see docs/01-architecture.md § Notifications: Web Push), not a formality:
// iOS Safari only supports any of this once the PWA is installed, on 16.4+.
import { getDeviceId } from "./device-id";

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)")?.matches || nav.standalone === true;
}

export function pushIsSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPermissionState(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/**
 * The single most likely reason push silently doesn't work — surfaced
 * explicitly rather than left to fail quietly (specs/T-018 criterion 3).
 */
export function iosNeedsInstallFirst(): boolean {
  return detectPlatform() === "ios" && !isStandalone();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? (await navigator.serviceWorker.register("/sw.js"));
}

export type SubscribeResult = { ok: true } | { ok: false; reason: string };

/** Requests permission, subscribes via the Push API, and registers the subscription server-side. */
export async function requestPermissionAndSubscribe(): Promise<SubscribeResult> {
  if (!pushIsSupported()) return { ok: false, reason: "This browser doesn't support push notifications." };
  if (iosNeedsInstallFirst()) return { ok: false, reason: "Add AquaAI to your Home Screen first — iOS only allows push for installed apps." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "Notification permission was not granted." };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false, reason: "Push isn't configured on the server yet." };

  const registration = await getServiceWorkerRegistration();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-id": getDeviceId() },
    body: JSON.stringify({ subscription: subscription.toJSON(), deviceLabel: `${detectPlatform()} · ${navigator.platform || "unknown"}` }),
  });
  if (!res.ok) return { ok: false, reason: "Saved the subscription in the browser but the server rejected it." };

  localStorage.setItem("aquaai-push-subscribed", "true");
  return { ok: true };
}

export async function unsubscribe(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
  await fetch("/api/push/subscribe", { method: "DELETE", headers: { "x-device-id": getDeviceId() } });
  localStorage.removeItem("aquaai-push-subscribed");
}

/** Whether THIS browser believes it subscribed — a local hint for the diagnostics screen, not proof the server still has it (see checkServerSubscription). */
export function locallyBelievesSubscribed(): boolean {
  return typeof window !== "undefined" && localStorage.getItem("aquaai-push-subscribed") === "true";
}

export async function checkBrowserSubscription(): Promise<boolean> {
  if (!pushIsSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription != null;
}

export async function syncReminder(params: { taskId: string; title: string; tankId: string; tankName: string; dueAt: string; rrule?: string | null }) {
  await fetch("/api/push/reminder", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-id": getDeviceId() },
    body: JSON.stringify(params),
  });
}

export async function removeReminderSync(taskId: string) {
  await fetch(`/api/push/reminder?taskId=${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    headers: { "x-device-id": getDeviceId() },
  });
}

export type TestResult = { ok: true } | { ok: false; error: string };

export async function sendTestReminder(): Promise<TestResult> {
  const res = await fetch("/api/push/test", { method: "POST", headers: { "x-device-id": getDeviceId() } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error ?? "Test reminder failed." };
  }
  return { ok: true };
}
