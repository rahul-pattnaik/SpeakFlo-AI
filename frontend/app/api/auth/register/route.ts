import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/auth-session";
import { ensureProfile, signUpWithPassword } from "@/lib/supabase-rest";

type RegisterRequest = {
  full_name?: string;
  email?: string;
  password?: string;
  english_level?: string;
};

function validate(payload: RegisterRequest) {
  const fullName = payload.full_name?.trim() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  const englishLevel = payload.english_level?.trim() || "Beginner";

  if (fullName.length < 2) {
    throw new Error("Full name must be at least 2 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return { fullName, email, password, englishLevel };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterRequest;
    const { fullName, email, password, englishLevel } = validate(body);

    const result = await signUpWithPassword({
      email,
      password,
      full_name: fullName,
      english_level: englishLevel,
    });

    const session = "access_token" in (result ?? {}) ? result : result?.session;
    const user = session?.user ?? result?.user;

    if (!user?.id || !user.email) {
      return NextResponse.json(
        {
          message:
            "Account created. If email confirmation is enabled in Supabase, confirm your email before logging in.",
          requires_email_confirmation: true,
        },
        { status: 201 }
      );
    }

    await ensureProfile({
      id: user.id,
      email: user.email,
      full_name:
        String(user.user_metadata?.full_name ?? fullName) || fullName,
      english_level:
        String(user.user_metadata?.english_level ?? englishLevel) || englishLevel,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          full_name: String(user.user_metadata?.full_name ?? fullName),
          english_level: String(user.user_metadata?.english_level ?? englishLevel),
        },
      },
      { status: 201 }
    );

    if (session?.access_token && session.refresh_token) {
      setAuthCookies(await cookies(), session);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not create account.",
      },
      { status: 400 }
    );
  }
}
