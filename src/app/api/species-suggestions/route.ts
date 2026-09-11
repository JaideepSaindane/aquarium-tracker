import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { serverDb } from "@/server/db/client";
import { speciesSuggestions } from "@/server/db/schema";
import { requireUserId } from "@/server/auth/require-user";
import { newId, nowIso } from "@/db/id";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await serverDb
    .select()
    .from(speciesSuggestions)
    .where(eq(speciesSuggestions.userId, userId))
    .orderBy(desc(speciesSuggestions.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = await req.json();
  const id = newId();
  await serverDb.insert(speciesSuggestions).values({
    id,
    userId,
    suggestedName: input.suggestedName,
    note: input.note,
    photoUri: input.photoUri,
    aiCandidates: input.aiCandidates ? JSON.stringify(input.aiCandidates) : null,
    status: "pending",
    createdAt: nowIso(),
  });
  return NextResponse.json({ id });
}
