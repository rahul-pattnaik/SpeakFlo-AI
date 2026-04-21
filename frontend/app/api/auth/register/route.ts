import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/auth-session";
import { registerWithBackend } from "@/lib/backend-auth";

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
    const { fullName, email, password } = validate(body);

    const result = await registerWithBackend({
      email,
      password,
      full_name: fullName,
    });

    setAuthCookies(await cookies(), result.tokens);

    return NextResponse.json(
      {
        message: `Welcome to SpeakFlo, ${result.user.full_name}.`,
        user: result.user,
      },
      { status: 201 }
    );
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
