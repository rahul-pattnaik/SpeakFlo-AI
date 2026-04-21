import "server-only";

import { getBackendApiUrl } from "@/lib/server-env";

export type BackendAuthUser = {
  id: number;
  email: string;
  full_name: string;
  english_level: string;
  subscription_tier?: string;
};

export type BackendProfile = BackendAuthUser & {
  is_active?: boolean;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string | null;
};

export type BackendTokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type BackendRefreshResponse = {
  access_token: string;
  expires_in: number;
};

type BackendAuthResponse = {
  success?: boolean;
  user: BackendAuthUser;
  tokens: BackendTokenPair;
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

async function assertOk(response: Response) {
  if (response.ok) {
    return;
  }

  const payload = await readJson(response);
  const message =
    (payload &&
      typeof payload === "object" &&
      ("detail" in payload
        ? String(payload.detail)
        : "message" in payload
          ? String(payload.message)
          : "error" in payload
            ? String(payload.error)
            : null)) ||
    `Backend request failed with status ${response.status}`;
  throw new Error(message);
}

async function backendFetch(path: string, init: RequestInit) {
  const response = await fetch(`${getBackendApiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  await assertOk(response);
  return readJson(response);
}

export async function loginWithBackend(input: {
  email: string;
  password: string;
}) {
  return (await backendFetch("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  })) as BackendAuthResponse;
}

export async function registerWithBackend(input: {
  email: string;
  password: string;
  full_name: string;
}) {
  return (await backendFetch("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      auth_provider: "email",
    }),
  })) as BackendAuthResponse;
}

export async function refreshBackendAccessToken(refreshToken: string) {
  return (await backendFetch("/api/v1/auth/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  })) as BackendRefreshResponse;
}

export async function getBackendProfile(accessToken: string) {
  return (await backendFetch("/api/v1/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })) as BackendProfile;
}
