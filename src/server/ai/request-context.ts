import type { NextRequest } from "next/server";
import { DEFAULT_PROVIDER, getProvider, serverApiKeyFor, type ProviderName } from "./providers";

export type RequestContext = {
  deviceId: string;
  provider: ReturnType<typeof getProvider>;
  providerName: ProviderName;
  isByok: boolean;
};

/**
 * Resolves which provider/key to use for this request. Bring-your-own-key:
 * the key travels in a header (never query string, never logged) and is
 * used for exactly this one call — see specs/T-013. `x-device-id` is
 * client-generated and self-reported (src/lib/device-id.ts); this is
 * anonymous-device tracking for free-tier quota, not authentication.
 */
export function resolveRequestContext(req: NextRequest): RequestContext | { error: string; status: number } {
  const deviceId = req.headers.get("x-device-id");
  if (!deviceId) return { error: "Missing x-device-id header.", status: 400 };

  const userKey = req.headers.get("x-user-api-key");
  const providerHeader = (req.headers.get("x-provider") as ProviderName | null) ?? DEFAULT_PROVIDER;

  if (userKey) {
    return { deviceId, provider: getProvider(providerHeader, userKey), providerName: providerHeader, isByok: true };
  }

  const serverKey = serverApiKeyFor(DEFAULT_PROVIDER);
  if (!serverKey) return { error: "Server is not configured with an AI provider key.", status: 500 };
  return { deviceId, provider: getProvider(DEFAULT_PROVIDER, serverKey), providerName: DEFAULT_PROVIDER, isByok: false };
}

export function isContextError(ctx: RequestContext | { error: string; status: number }): ctx is { error: string; status: number } {
  return "error" in ctx;
}
