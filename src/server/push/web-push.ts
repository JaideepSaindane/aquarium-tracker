import webPush from "web-push";
import type { PushSubscriptionJson } from "./store";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT are not set — Web Push is not configured.");
  }
  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = { title: string; body: string; taskId: string; tankId: string };

export type SendResult = { ok: true } | { ok: false; statusCode?: number; message: string };

export async function sendPush(subscription: PushSubscriptionJson, payload: PushPayload): Promise<SendResult> {
  ensureConfigured();
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return { ok: false, statusCode, message: err instanceof Error ? err.message : String(err) };
  }
}
