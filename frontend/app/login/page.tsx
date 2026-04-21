"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Could not sign in.");
      }

      setSuccessMessage(data.message || "Signed in successfully.");
      const nextPath = new URLSearchParams(window.location.search).get("next");
      const destination =
        nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not sign in."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#f0ebdf_0%,#fcf4e4_45%,#e6edf7_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[32px] border border-stone-900/10 bg-white/85 p-8 shadow-[0_24px_70px_rgba(69,47,11,0.12)] backdrop-blur sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            Welcome back
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">
            Sign in to continue your English practice
          </h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              placeholder="Email address"
              className="w-full rounded-2xl border border-stone-900/10 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            />
            <input
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              type="password"
              placeholder="Password"
              className="w-full rounded-2xl border border-stone-900/10 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-stone-950 px-5 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {successMessage && (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {successMessage}
            </p>
          )}

          {errorMessage && (
            <p className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
              {errorMessage}
            </p>
          )}

          <p className="mt-6 text-sm text-stone-600">
            New to SpeakFlo?{" "}
            <Link
              href="/signup"
              className="font-semibold text-stone-950 underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </section>

        <section className="rounded-[32px] border border-stone-900/10 bg-stone-950 p-8 text-stone-50 shadow-[0_30px_90px_rgba(24,18,8,0.28)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
            SpeakFlo AI
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight">
            Your low-cost AI English coach with real session memory.
          </h2>
          <div className="mt-8 space-y-4 text-sm leading-7 text-stone-300">
            <p>Practice conversation, grammar, vocabulary, and speaking in one place.</p>
            <p>
              Each session saves corrections, revision words, and weak areas so the
              next session feels more personal.
            </p>
            <p>
              The auth flow uses secure HTTP-only cookies so login state stays on the
              server where it belongs.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
