import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  readAccessToken,
  readRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "@/lib/auth-session";
import {
  ensureProfile,
  getAuthUser,
  getProfile,
  refreshSession,
} from "@/lib/supabase-rest";

export async function GET() {
  const cookieStore = await cookies();
  let accessToken = readAccessToken(cookieStore);
  const refreshToken = readRefreshToken(cookieStore);

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  try {
    let authUser;

    try {
      if (!accessToken) {
        throw new Error("Missing access token.");
      }
      authUser = await getAuthUser(accessToken);
    } catch {
      if (!refreshToken) {
        throw new Error("Session expired.");
      }
      const session = await refreshSession(refreshToken);
      setAuthCookies(cookieStore, session);
      accessToken = session.access_token;
      authUser = await getAuthUser(accessToken);
    }

    let profile = await getProfile(authUser.id);
    if (!profile) {
      const metadata = authUser.user_metadata ?? {};
      profile = await ensureProfile({
        id: authUser.id,
        email: authUser.email,
        full_name: String(metadata.full_name ?? "Learner"),
        english_level: String(metadata.english_level ?? "Beginner"),
      });
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    clearAuthCookies(cookieStore);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not load session.",
      },
      { status: 401 }
    );
  }
}
