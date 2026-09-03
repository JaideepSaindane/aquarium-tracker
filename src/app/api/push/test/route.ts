import { NextRequest, NextResponse } from "next/server";
import { getSubscription, pruneDevice } from "@/server/push/store";
import { sendPush } from "@/server/push/web-push";

// Powers the diagnostics screen's "send a test reminder" button (specs/T-018
// acceptance criterion 9) — sends immediately through the real backend so a
// silent failure is caught before a real reminder is ever missed.
export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) return NextResponse.json({ error: "Missing x-device-id header" }, { status: 400 });

  const subscription = await getSubscription(deviceId);
  if (!subscription) {
    return NextResponse.json({ error: "No push subscription registered for this device yet." }, { status: 404 });
  }

  const result = await sendPush(subscription, {
    title: "Test reminder",
    body: "If you can see this, push notifications are working.",
    taskId: "test",
    tankId: "",
  });

  if (!result.ok) {
    if (result.statusCode === 404 || result.statusCode === 410) {
      await pruneDevice(deviceId);
      return NextResponse.json({ error: "Subscription was no longer valid and has been removed. Please re-enable reminders." }, { status: 410 });
    }
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
