import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearAuthCookies } from "@/lib/auth-session";

export async function POST() {
  clearAuthCookies(await cookies());
  return NextResponse.json({ success: true });
}
