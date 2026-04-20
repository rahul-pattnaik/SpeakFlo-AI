import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readAccessToken } from "@/lib/auth-session";
import { buildDailyWords } from "@/lib/coach-content";
import { getAuthUser, getProfile, getRevisionWords } from "@/lib/supabase-rest";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessToken(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ message: "Please log in first." }, { status: 401 });
    }

    const authUser = await getAuthUser(accessToken);
    const profile = await getProfile(authUser.id);
    if (!profile) {
      return NextResponse.json(
        { message: "Learner profile is missing. Please sign in again." },
        { status: 409 }
      );
    }

    const revisionWords = await getRevisionWords(authUser.id);

    return NextResponse.json({
      focus_date: new Date().toISOString().slice(0, 10),
      words: buildDailyWords(profile.english_level, revisionWords),
      revision_words: revisionWords,
      source: "local-curated",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not load vocabulary.",
      },
      { status: 500 }
    );
  }
}
