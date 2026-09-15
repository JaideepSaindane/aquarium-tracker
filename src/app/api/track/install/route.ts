import { NextResponse } from "next/server";
import { serverDb } from "@/server/db/client";
import { appInstalls } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

// Logged once per real browser `appinstalled` event (src/app/InstallPromptListener.tsx)
// so the admin dashboard can show real install counts, not a guess.
export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await serverDb.insert(appInstalls).values({ id: newId(), userId, createdAt: nowIso() });
  return NextResponse.json({ ok: true });
}
