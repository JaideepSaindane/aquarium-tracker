import { NextRequest, NextResponse } from "next/server";
import { saveSubscription, pruneDevice } from "@/server/push/store";

// Registers (or replaces) this device's push subscription. Called right
// after the browser grants notification permission — see src/lib/push-client.ts.
export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) return NextResponse.json({ error: "Missing x-device-id header" }, { status: 400 });

  const body = await req.json();
  if (!body?.subscription?.endpoint || !body?.subscription?.keys?.p256dh || !body?.subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  await saveSubscription(deviceId, body.subscription, body.deviceLabel);
  return NextResponse.json({ ok: true });
}

// Unsubscribes this device — removes the subscription and every reminder
// mirrored for it, so nothing lingers server-side after the user opts out.
export async function DELETE(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) return NextResponse.json({ error: "Missing x-device-id header" }, { status: 400 });
  await pruneDevice(deviceId);
  return NextResponse.json({ ok: true });
}
