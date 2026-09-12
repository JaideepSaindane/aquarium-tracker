import type { NextRequest } from "next/server";
import { DEFAULT_PROVIDER, getProvider, serverApiKeyFor, type ProviderName } from "./providers";

export type RequestContext = {
  deviceId: string;
  provider: ReturnType<typeof getProvider>;
  providerName: ProviderName;
};

/**
 * Resolves which provider to use for this request — always the server's
 * own key (bring-your-own-key mode was removed 2026-09-12: it was fully
 * wired end-to-end but never had a UI to actually enter a key, so nobody
 * could reach it — dead code, not a real feature). `x-device-id` is
 * client-generated and self-reported (src/lib/device-id.ts); this is
 * anonymous-device tracking for free-tier quota, not authentication.
 */
export function resolveRequestContext(req: NextRequest): RequestContext | { error: string; status: number } {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) return { error: "Missing x-device-id header.", status: 400 };

  const serverKey = serverApiKeyFor(DEFAULT_PROVIDER);
  if (!serverKey) return { error: "Server is not configured with an AI provider key.", status: 500 };
  return { deviceId, provider: getProvider(DEFAULT_PROVIDER, serverKey), providerName: DEFAULT_PROVIDER };
}

export function isContextError(ctx: RequestContext | { error: string; status: number }): ctx is { error: string; status: number } {
  return "error" in ctx;
}
