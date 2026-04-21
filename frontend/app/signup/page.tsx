"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    english_level: "Beginner",
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as {
        message?: string;
        requires_email_confirmation?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.message || "Could not create account.");
      }

      if (data.requires_email_confirmation) {
        setMessage(data.message || "Check your email to confirm your account.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not create account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff1cf_0%,#efe8dc_52%,#e7eef8_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-stone-900/10 bg-stone-950 p-8 text-stone-50 shadow-[0_30px_90px_rgba(24,18,8,0.28)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
            SpeakFlo AI
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Build confident spoken English with a coach that remembers where you struggle.
          </h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Gentle sentence correction with clear explanations",
              "Daily vocabulary practice with revision memory",
              "Grammar coaching in simple English",
              "Secure session cookies and protected learning routes",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-stone-200"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-stone-900/10 bg-white/85 p-8 shadow-[0_24px_70px_rgba(69,47,11,0.12)] backdrop-blur sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                Create account
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
                Start your first learning session today
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              value={form.full_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, full_name: event.target.value }))
              }
              type="text"
              placeholder="Full name"
              className="w-full rounded-2xl border border-stone-900/10 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            />
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
            <select
              value={form.english_level}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  english_level: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-stone-900/10 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-500"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-stone-950 px-5 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
              {message}
            </p>
          )}

          <p className="mt-6 text-sm text-stone-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-stone-950 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
