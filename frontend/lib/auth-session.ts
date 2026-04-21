import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const ACCESS_TOKEN_COOKIE = "sf-access-token";
export const REFRESH_TOKEN_COOKIE = "sf-refresh-token";

const baseCookie: Pick<
  ResponseCookie,
  "httpOnly" | "sameSite" | "secure" | "path"
> = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export type CookieStore = {
  set: (name: string, value: string, options?: Partial<ResponseCookie>) => void;
  delete: (name: string) => void;
  get: (name: string) => { value: string } | undefined;
};

export function setAuthCookies(
  cookieStore: CookieStore,
  tokens: { access_token: string; refresh_token?: string; expires_in?: number }
) {
  const maxAge = tokens.expires_in ?? 60 * 60;
  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...baseCookie,
    maxAge,
  });
  if (tokens.refresh_token) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      ...baseCookie,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export function clearAuthCookies(cookieStore: CookieStore) {
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export function readAccessToken(cookieStore: Pick<CookieStore, "get">) {
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function readRefreshToken(cookieStore: Pick<CookieStore, "get">) {
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

export function hasAuthCookies(cookieStore: Pick<CookieStore, "get">) {
  return Boolean(readAccessToken(cookieStore) || readRefreshToken(cookieStore));
}
