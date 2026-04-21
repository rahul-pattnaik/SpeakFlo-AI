import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import DashboardClient from "@/app/dashboard/dashboard-client";
import { resolveSession } from "@/lib/auth-server";

export default async function DashboardPage() {
  const session = await resolveSession(await cookies());

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient user={session.profile} />;
}
