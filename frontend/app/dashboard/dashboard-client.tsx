"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Learner = {
  id: number;
  email: string;
  full_name: string;
  english_level: string;
};

export default function DashboardClient({ user }: { user: Learner }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");

  async function logout() {
    setLoggingOut(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Could not log out.");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff0cc_0%,#f6f1e7_42%,#e7ecf4_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-stone-900/10 bg-white/80 shadow-[0_20px_80px_rgba(73,54,10,0.12)] backdrop-blur">
          <div className="grid gap-6 p-6 md:grid-cols-[1.5fr_0.8fr] md:p-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                Protected Dashboard
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                You&apos;re signed in and your session is active.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600">
                This route is guarded by middleware before render, and the page also
                resolves the current user server-side using the access token with refresh
                fallback when needed.
              </p>
            </div>

            <div className="rounded-[28px] bg-stone-950 p-6 text-stone-50">
              <p className="text-sm uppercase tracking-[0.2em] text-amber-300">
                Session details
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-stone-200">
                <p>
                  <span className="font-semibold text-white">Name:</span> {user.full_name}
                </p>
                <p>
                  <span className="font-semibold text-white">Email:</span> {user.email}
                </p>
                <p>
                  <span className="font-semibold text-white">Level:</span>{" "}
                  {user.english_level}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                disabled={loggingOut}
                className="mt-6 rounded-full border border-white/10 px-4 py-2 text-sm text-stone-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            "Signup stores the authenticated session in HTTP-only cookies.",
            "Login refreshes the dashboard route immediately after session creation.",
            "Logout clears both access and refresh cookies on the server.",
          ].map((item) => (
            <article
              key={item}
              className="rounded-[28px] border border-stone-900/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(66,45,9,0.08)]"
            >
              <p className="text-sm leading-7 text-stone-700">{item}</p>
            </article>
          ))}
        </section>

        {message && (
          <p className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
