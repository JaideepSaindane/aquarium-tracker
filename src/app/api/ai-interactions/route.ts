import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { aiInteractions } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await serverDb.select().from(aiInteractions).where(eq(aiInteractions.userId, userId));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const now = nowIso();
  const id = newId();
  await serverDb.insert(aiInteractions).values({
    id,
    userId,
    tankId: input.tankId ?? null,
    kind: input.kind,
    promptVersion: input.promptVersion,
    userInput: input.userInput,
    groundingRefs: JSON.stringify(input.groundingRefs ?? []),
    response: JSON.stringify(input.response),
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    costUsd: input.costUsd,
    latencyMs: input.latencyMs,
    createdAt: now,
  });
  return NextResponse.json({ id });
}
