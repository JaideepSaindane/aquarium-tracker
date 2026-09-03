import { NextRequest, NextResponse } from "next/server";
import { upsertReminder, removeReminder } from "@/server/push/store";

// Mirrors (or removes) a single reminder's schedule on the server, so the
// cron in /api/push/send can find it. Called by src/lib/push-client.ts
// whenever a task is created, its due time changes, or it's completed —
// never sends any tank/species/measurement data, only what's needed to
// fire a notification at the right time (see src/server/push/store.ts).
export async function POST(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) return NextResponse.json({ error: "Missing x-device-id header" }, { status: 400 });

  const body = await req.json();
  const { taskId, title, tankId, tankName, dueAt, rrule } = body ?? {};
  if (!taskId || !title || !tankId || !dueAt) {
    return NextResponse.json({ error: "taskId, title, tankId and dueAt are required" }, { status: 400 });
  }

  await upsertReminder({ deviceId, taskId, title, tankId, tankName: tankName ?? "", dueAt, rrule: rrule ?? null });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) return NextResponse.json({ error: "Missing x-device-id header" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "Missing taskId query param" }, { status: 400 });

  await removeReminder(deviceId, taskId);
  return NextResponse.json({ ok: true });
}
