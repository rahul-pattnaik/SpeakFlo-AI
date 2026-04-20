import "server-only";

import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/server-env";

export type LearnerProfile = {
  id: string;
  email: string;
  full_name: string;
  english_level: string;
  learning_goal?: string | null;
  timezone?: string | null;
  created_at?: string;
  updated_at?: string;
};

type SupabaseAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
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
      ("msg" in payload
        ? String(payload.msg)
        : "message" in payload
          ? String(payload.message)
          : "error_description" in payload
            ? String(payload.error_description)
            : "error" in payload
              ? String(payload.error)
              : null)) ||
    `Supabase request failed with status ${response.status}`;
  throw new Error(message);
}

function authHeaders(accessToken?: string) {
  const headers = new Headers({
    apikey: getSupabaseAnonKey(),
    "Content-Type": "application/json",
  });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return headers;
}

function serviceHeaders() {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  return new Headers({
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  });
}

async function supabaseAuthFetch(path: string, init: RequestInit) {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1${path}`, {
    ...init,
    cache: "no-store",
  });
  await assertOk(response);
  return readJson(response);
}

async function supabaseRestFetch(path: string, init: RequestInit) {
  const response = await fetch(`${getSupabaseUrl()}/rest/v1${path}`, {
    ...init,
    cache: "no-store",
  });
  await assertOk(response);
  return readJson(response);
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  full_name: string;
  english_level: string;
}) {
  return (await supabaseAuthFetch("/signup", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: {
        full_name: input.full_name,
        english_level: input.english_level,
      },
    }),
  })) as (SupabaseAuthSession & { session?: SupabaseAuthSession | null }) | null;
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}) {
  return (await supabaseAuthFetch("/token?grant_type=password", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  })) as SupabaseAuthSession;
}

export async function refreshSession(refreshToken: string) {
  return (await supabaseAuthFetch("/token?grant_type=refresh_token", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  })) as SupabaseAuthSession;
}

export async function getAuthUser(accessToken: string) {
  return (await supabaseAuthFetch("/user", {
    method: "GET",
    headers: authHeaders(accessToken),
  })) as {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
}

export async function upsertProfile(profile: LearnerProfile) {
  const headers = serviceHeaders();
  headers.set("Prefer", "resolution=merge-duplicates, return=representation");

  const payload = await supabaseRestFetch("/profiles?on_conflict=id", {
    method: "POST",
    headers,
    body: JSON.stringify(profile),
  });

  return (Array.isArray(payload) ? payload[0] : payload) as LearnerProfile;
}

export async function getProfile(userId: string) {
  const payload = await supabaseRestFetch(
    `/profiles?id=eq.${encodeURIComponent(userId)}&select=*`,
    {
      method: "GET",
      headers: serviceHeaders(),
    }
  );

  return (Array.isArray(payload) ? payload[0] : null) as LearnerProfile | null;
}

export async function ensureProfile(input: {
  id: string;
  email: string;
  full_name: string;
  english_level: string;
}) {
  return upsertProfile({
    id: input.id,
    email: input.email,
    full_name: input.full_name,
    english_level: input.english_level,
  });
}

export async function createLearningSession(input: {
  id: string;
  user_id: string;
  mode: string;
  topic?: string | null;
  title?: string | null;
  source: string;
}) {
  const headers = serviceHeaders();
  headers.set("Prefer", "return=representation");
  const payload = await supabaseRestFetch("/learning_sessions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...input,
      status: "active",
    }),
  });

  return Array.isArray(payload) ? payload[0] : payload;
}

export async function insertLearningEvent(input: Record<string, unknown>) {
  const headers = serviceHeaders();
  headers.set("Prefer", "return=representation");
  const payload = await supabaseRestFetch("/learning_session_events", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return Array.isArray(payload) ? payload[0] : payload;
}

export async function markSessionCompleted(sessionId: string, summary: Record<string, unknown>) {
  const headers = serviceHeaders();
  headers.set("Prefer", "return=representation");
  const payload = await supabaseRestFetch(
    `/learning_sessions?id=eq.${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "completed",
        ended_at: new Date().toISOString(),
        summary,
      }),
    }
  );
  return Array.isArray(payload) ? payload[0] : payload;
}

export async function getRevisionWords(userId: string) {
  const payload = await supabaseRestFetch(
    `/weak_areas?user_id=eq.${encodeURIComponent(userId)}&area_type=eq.vocabulary&select=area_name,error_count,last_seen_at&order=last_seen_at.desc&limit=5`,
    {
      method: "GET",
      headers: serviceHeaders(),
    }
  );

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => String(item.area_name));
}

export async function insertVocabularyReview(input: Record<string, unknown>) {
  const headers = serviceHeaders();
  headers.set("Prefer", "return=representation");
  const payload = await supabaseRestFetch("/vocabulary_reviews", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return Array.isArray(payload) ? payload[0] : payload;
}

export async function recordWeakArea(input: {
  user_id: string;
  area_type: string;
  area_key: string;
  area_name: string;
  recommended_mode: string;
  confidence_delta?: number;
}) {
  const existing = await supabaseRestFetch(
    `/weak_areas?user_id=eq.${encodeURIComponent(input.user_id)}&area_type=eq.${encodeURIComponent(input.area_type)}&area_key=eq.${encodeURIComponent(input.area_key)}&select=*`,
    {
      method: "GET",
      headers: serviceHeaders(),
    }
  );

  const first = Array.isArray(existing) ? existing[0] : null;
  const headers = serviceHeaders();
  headers.set("Prefer", "return=representation");

  if (first) {
    const payload = await supabaseRestFetch(
      `/weak_areas?id=eq.${encodeURIComponent(String(first.id))}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          error_count: Number(first.error_count ?? 0) + 1,
          confidence_score: Math.max(
            20,
            Math.min(95, Number(first.confidence_score ?? 50) - (input.confidence_delta ?? 5))
          ),
          last_seen_at: new Date().toISOString(),
          recommended_mode: input.recommended_mode,
        }),
      }
    );

    return Array.isArray(payload) ? payload[0] : payload;
  }

  const payload = await supabaseRestFetch("/weak_areas", {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: crypto.randomUUID(),
      user_id: input.user_id,
      area_type: input.area_type,
      area_key: input.area_key,
      area_name: input.area_name,
      error_count: 1,
      confidence_score: 50,
      recommended_mode: input.recommended_mode,
      last_seen_at: new Date().toISOString(),
    }),
  });

  return Array.isArray(payload) ? payload[0] : payload;
}

export async function getProgressData(userId: string) {
  const [sessions, weakAreas, vocabularyReviews] = await Promise.all([
    supabaseRestFetch(
      `/learning_sessions?user_id=eq.${encodeURIComponent(userId)}&select=id,mode,status,started_at,ended_at,created_at,summary&order=created_at.desc`,
      {
        method: "GET",
        headers: serviceHeaders(),
      }
    ),
    supabaseRestFetch(
      `/weak_areas?user_id=eq.${encodeURIComponent(userId)}&select=*`,
      {
        method: "GET",
        headers: serviceHeaders(),
      }
    ),
    supabaseRestFetch(
      `/vocabulary_reviews?user_id=eq.${encodeURIComponent(userId)}&select=id,needs_review,created_at&order=created_at.desc`,
      {
        method: "GET",
        headers: serviceHeaders(),
      }
    ),
  ]);

  return {
    sessions: Array.isArray(sessions) ? sessions : [],
    weakAreas: Array.isArray(weakAreas) ? weakAreas : [],
    vocabularyReviews: Array.isArray(vocabularyReviews) ? vocabularyReviews : [],
  };
}
