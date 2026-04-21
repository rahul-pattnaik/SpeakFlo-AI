import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/lib/auth-session";
import { resolveSession } from "@/lib/auth-server";

export async function GET() {
  const cookieStore = await cookies();

  try {
    const session = await resolveSession(cookieStore);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    return NextResponse.json({ user: session.profile });
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
