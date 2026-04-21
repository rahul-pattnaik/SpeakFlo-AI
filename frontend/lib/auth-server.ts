import "server-only";

import {
  clearAuthCookies,
  readAccessToken,
  readRefreshToken,
  setAuthCookies,
  type CookieStore,
} from "@/lib/auth-session";
import {
  getBackendProfile,
  refreshBackendAccessToken,
  type BackendProfile,
} from "@/lib/backend-auth";

export type ResolvedSession = {
  profile: BackendProfile;
};

export async function resolveSession(
  cookieStore: CookieStore
): Promise<ResolvedSession | null> {
  const accessToken = readAccessToken(cookieStore);
  const refreshToken = readRefreshToken(cookieStore);

  if (!accessToken && !refreshToken) {
    return null;
  }

  try {
    let profile;

    try {
      if (!accessToken) {
        throw new Error("Missing access token.");
      }
      profile = await getBackendProfile(accessToken);
    } catch {
      if (!refreshToken) {
        throw new Error("Session expired.");
      }
      const refreshed = await refreshBackendAccessToken(refreshToken);
      setAuthCookies(cookieStore, {
        access_token: refreshed.access_token,
        expires_in: refreshed.expires_in,
      });
      profile = await getBackendProfile(refreshed.access_token);
    }

    return { profile };
  } catch {
    clearAuthCookies(cookieStore);
    return null;
  }
}
