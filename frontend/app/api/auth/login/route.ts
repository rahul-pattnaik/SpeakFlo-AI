import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/auth-session";
import { loginWithBackend } from "@/lib/backend-auth";

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

    const result = await loginWithBackend({ email, password });
    setAuthCookies(await cookies(), result.tokens);

    return NextResponse.json({
      message: `Welcome back, ${result.user.full_name}.`,
      user: result.user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not sign in.",
      },
      { status: 401 }
    );
  }
}
