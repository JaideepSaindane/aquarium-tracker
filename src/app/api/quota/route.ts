import { NextRequest, NextResponse } from "next/server";
import { resolveRequestContext, isContextError } from "@/server/ai/request-context";
import { requireUserId } from "@/server/auth/require-user";
import { peekQuota, EARLY_BIRD_MODE } from "@/server/ai/quota";

// Read-only quota check — never increments. Lets the client show the
// remaining count honestly before the last question, not after
// (specs/T-019 acceptance criterion 8), instead of a surprise 429 wall.
export async function GET(req: NextRequest) {
  const ctx = resolveRequestContext(req);
  if (isContextError(ctx)) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const kind = req.nextUrl.searchParams.get("kind");
  if (kind !== "scan" && kind !== "ask") return NextResponse.json({ error: "kind must be scan or ask" }, { status: 400 });

  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const quota = await peekQuota(userId, kind);
  return NextResponse.json({ earlyBird: EARLY_BIRD_MODE, ...quota });
}
