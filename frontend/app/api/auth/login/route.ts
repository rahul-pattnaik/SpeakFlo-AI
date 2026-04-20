import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/auth-session";
import { ensureProfile, getProfile, signInWithPassword } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    const session = await signInWithPassword({ email, password });
    const userMetadata = session.user.user_metadata ?? {};

    let profile = await getProfile(session.user.id);
    if (!profile) {
      profile = await ensureProfile({
        id: session.user.id,
        email: session.user.email ?? email,
        full_name: String(userMetadata.full_name ?? "Learner"),
        english_level: String(userMetadata.english_level ?? "Beginner"),
      });
    }

    setAuthCookies(await cookies(), session);

    return NextResponse.json({
      user: profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not sign in.",
      },
      { status: 401 }
    );
  }
}
