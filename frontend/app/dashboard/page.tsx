"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CoachMode = "conversation" | "vocabulary" | "grammar" | "speaking";

type Learner = {
  id: string;
  email: string;
  full_name: string;
  english_level: string;
};

type CoachResponse = {
  session_id: string;
  mode: Exclude<CoachMode, "vocabulary">;
  reply: string;
  corrected_text?: string | null;
  explanation?: string | null;
  examples: string[];
  follow_up_question?: string | null;
  practice_question?: string | null;
  fluency_feedback?: string | null;
  source: string;
  generated_at: string;
};

type VocabularyDailyResponse = {
  focus_date: string;
  words: Array<{
    word: string;
    meaning: string;
    example: string;
    learner_prompt: string;
    revision_hint: string;
    is_weak: boolean;
  }>;
  revision_words: string[];
  source: string;
};

type VocabularyReviewResponse = {
  word: string;
  feedback: string;
  corrected_sentence?: string | null;
  example: string;
  should_review_again: boolean;
  revision_words: string[];
  source: string;
};

type ProgressDashboard = {
  daily_stats: {
    practice_minutes_today: number;
    sessions_completed_today: number;
    words_reviewed_today: number;
    streak: number;
  };
  overall_stats: {
    total_practice_hours: number;
    total_sessions_completed: number;
    total_words_reviewed: number;
    weak_words_count: number;
    overall_score: number;
  };
  recommended_next_task: {
    mode: string;
    reason: string;
  };
  weak_areas: Array<{
    area: string;
    confidence: number;
    priority: number;
    recommended_mode: string;
  }>;
};

const modeCards: Array<{
  id: CoachMode;
  title: string;
  subtitle: string;
}> = [
  {
    id: "conversation",
    title: "Conversation mode",
    subtitle: "Natural reply, soft correction, simple explanation, next question.",
  },
  {
    id: "vocabulary",
    title: "Vocabulary mode",
    subtitle: "Five daily words, examples, learner sentence, weak-word revision.",
  },
  {
    id: "grammar",
    title: "Grammar mode",
    subtitle: "Sentence check, easy explanation, two examples, mini practice.",
  },
  {
    id: "speaking",
    title: "Speaking mode",
    subtitle: "Transcript review today, voice pipeline and Realtime upgrade path next.",
  },
];

async function jsonFetch<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await response.json()) as { message?: string } & T;
  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data as T;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Learner | null>(null);
  const [progress, setProgress] = useState<ProgressDashboard | null>(null);
  const [activeMode, setActiveMode] = useState<CoachMode>("conversation");
  const [message, setMessage] = useState("Today I went market and buy vegetables.");
  const [coachResult, setCoachResult] = useState<CoachResponse | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyDailyResponse | null>(null);
  const [selectedWord, setSelectedWord] = useState("");
  const [meaningAttempt, setMeaningAttempt] = useState("");
  const [sentenceAttempt, setSentenceAttempt] = useState("");
  const [reviewResult, setReviewResult] = useState<VocabularyReviewResponse | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [sessionIdByMode, setSessionIdByMode] = useState<
    Partial<Record<Exclude<CoachMode, "vocabulary">, string>>
  >({});

  useEffect(() => {
    void (async () => {
      try {
        const [{ user }, dashboard] = await Promise.all([
          jsonFetch<{ user: Learner }>("/api/auth/me"),
          jsonFetch<ProgressDashboard>("/api/progress/dashboard"),
        ]);

        setUser(user);
        setProgress(dashboard);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (activeMode !== "vocabulary" || !user) {
      return;
    }

    void (async () => {
      try {
        const data = await jsonFetch<VocabularyDailyResponse>(
          "/api/coach/vocabulary/daily"
        );
        setVocabulary(data);
        setSelectedWord(data.words[0]?.word ?? "");
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Could not load vocabulary."
        );
      }
    })();
  }, [activeMode, user]);

  async function loadVocabulary() {
    try {
      const data = await jsonFetch<VocabularyDailyResponse>(
        "/api/coach/vocabulary/daily"
      );
      setVocabulary(data);
      setSelectedWord(data.words[0]?.word ?? "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load vocabulary.");
    }
  }

  async function submitCoachPrompt() {
    if (activeMode === "vocabulary") {
      return;
    }

    setLoadingCoach(true);
    setStatus("");
    setCoachResult(null);

    try {
      const data = await jsonFetch<CoachResponse>("/api/coach/respond", {
        method: "POST",
        body: JSON.stringify({
          mode: activeMode,
          user_input: message,
          session_id: sessionIdByMode[activeMode],
        }),
      });

      setCoachResult(data);
      setSessionIdByMode((current) => ({
        ...current,
        [activeMode]: data.session_id,
      }));
      const dashboard = await jsonFetch<ProgressDashboard>("/api/progress/dashboard");
      setProgress(dashboard);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Coach request failed.");
    } finally {
      setLoadingCoach(false);
    }
  }

  async function submitVocabularyReview() {
    if (!selectedWord || !sentenceAttempt.trim()) {
      setStatus("Choose a word and write your own sentence first.");
      return;
    }

    setLoadingCoach(true);
    setStatus("");
    setReviewResult(null);

    try {
      const data = await jsonFetch<VocabularyReviewResponse>(
        "/api/coach/vocabulary/review",
        {
          method: "POST",
          body: JSON.stringify({
            word: selectedWord,
            user_sentence: sentenceAttempt,
            user_meaning: meaningAttempt,
            confident: meaningAttempt.trim().length > 0,
          }),
        }
      );
      setReviewResult(data);
      const [dashboard, words] = await Promise.all([
        jsonFetch<ProgressDashboard>("/api/progress/dashboard"),
        jsonFetch<VocabularyDailyResponse>("/api/coach/vocabulary/daily"),
      ]);
      setProgress(dashboard);
      setVocabulary(words);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Vocabulary review failed."
      );
    } finally {
      setLoadingCoach(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) {
    return <p className="p-8 text-stone-700">Loading your learning space...</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff0cc_0%,#f6f1e7_42%,#e7ecf4_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-stone-900/10 bg-white/80 shadow-[0_20px_80px_rgba(73,54,10,0.12)] backdrop-blur">
          <div className="grid gap-6 p-6 md:grid-cols-[1.6fr_0.9fr] md:p-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                SpeakFlo Coach
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Learn with one AI coach that remembers your sessions and weak areas.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600">
                Your Next.js app is now handling auth, coaching, and progress directly with Supabase-backed data and server-side AI calls.
              </p>
            </div>

            <div className="rounded-[28px] bg-stone-950 p-6 text-stone-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-amber-300">
                    Learner snapshot
                  </p>
                  <p className="mt-3 text-2xl font-semibold">{user.full_name}</p>
                  <p className="text-stone-300">Level: {user.english_level}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-stone-200 transition hover:bg-white/10"
                >
                  Logout
                </button>
              </div>

              {progress && (
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-stone-400">Practice today</p>
                    <p className="mt-2 text-lg font-semibold">
                      {progress.daily_stats.practice_minutes_today} min
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-stone-400">Streak</p>
                    <p className="mt-2 text-lg font-semibold">
                      {progress.daily_stats.streak} days
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-stone-400">Overall score</p>
                    <p className="mt-2 text-lg font-semibold">
                      {progress.overall_stats.overall_score}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-stone-400">Weak words</p>
                    <p className="mt-2 text-lg font-semibold">
                      {progress.overall_stats.weak_words_count}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modeCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveMode(card.id)}
              className={`rounded-[28px] border p-5 text-left transition duration-200 ${
                activeMode === card.id
                  ? "border-stone-950 bg-stone-950 text-white shadow-[0_18px_50px_rgba(28,25,23,0.24)]"
                  : "border-stone-900/10 bg-white/70 text-stone-900 hover:border-amber-500/40 hover:bg-white"
              }`}
            >
              <p className="text-lg font-semibold">{card.title}</p>
              <p
                className={`mt-2 text-sm leading-6 ${
                  activeMode === card.id ? "text-stone-300" : "text-stone-600"
                }`}
              >
                {card.subtitle}
              </p>
            </button>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-stone-900/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(59,45,16,0.08)]">
            {activeMode === "vocabulary" ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                      Daily words
                    </p>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      Five words for today
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadVocabulary()}
                    className="rounded-full border border-stone-900/15 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-950 hover:text-white"
                  >
                    Refresh words
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {vocabulary?.words.map((word) => (
                    <button
                      key={word.word}
                      type="button"
                      onClick={() => {
                        setSelectedWord(word.word);
                        setReviewResult(null);
                      }}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        selectedWord === word.word
                          ? "border-amber-500 bg-amber-50"
                          : "border-stone-900/10 bg-stone-50 hover:border-stone-950/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xl font-semibold capitalize">{word.word}</p>
                        {word.is_weak && (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-rose-700">
                            Revise
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-stone-600">{word.meaning}</p>
                      <p className="mt-3 text-sm italic text-stone-500">{word.example}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-[28px] border border-stone-900/10 bg-stone-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.15em] text-stone-500">
                    Practice selected word
                  </p>
                  <p className="mt-2 text-xl font-semibold capitalize">
                    {selectedWord || "Choose a word"}
                  </p>
                  <div className="mt-5 grid gap-4">
                    <textarea
                      value={meaningAttempt}
                      onChange={(event) => setMeaningAttempt(event.target.value)}
                      rows={3}
                      placeholder="Write the meaning in easy English."
                      className="w-full rounded-2xl border border-stone-900/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500"
                    />
                    <textarea
                      value={sentenceAttempt}
                      onChange={(event) => setSentenceAttempt(event.target.value)}
                      rows={4}
                      placeholder="Make your own sentence with the selected word."
                      className="w-full rounded-2xl border border-stone-900/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => void submitVocabularyReview()}
                      className="inline-flex w-fit rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                    >
                      {loadingCoach ? "Checking..." : "Review my sentence"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                    {activeMode} mode
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
                    {activeMode === "conversation" &&
                      "Coach natural conversation with gentle correction"}
                    {activeMode === "grammar" &&
                      "Explain grammar mistakes in simple English"}
                    {activeMode === "speaking" &&
                      "Analyze transcripts now and prepare for voice next"}
                  </h2>
                </div>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                  className="w-full rounded-[28px] border border-stone-900/10 bg-stone-50 px-5 py-4 text-base leading-7 outline-none transition focus:border-amber-500"
                />

                <button
                  type="button"
                  onClick={() => void submitCoachPrompt()}
                  className="inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  {loadingCoach ? "Thinking..." : "Ask SpeakFlo Coach"}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-stone-900/10 bg-stone-950 p-6 text-white shadow-[0_24px_70px_rgba(22,18,12,0.22)]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
                Coach output
              </p>

              {status && (
                <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {status}
                </p>
              )}

              {!status && activeMode !== "vocabulary" && coachResult && (
                <div className="mt-5 space-y-4 text-sm leading-7 text-stone-200">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Reply</p>
                    <p className="mt-1 text-base text-white">{coachResult.reply}</p>
                  </div>
                  {coachResult.corrected_text && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                        Corrected sentence
                      </p>
                      <p className="mt-1 text-base text-amber-300">
                        {coachResult.corrected_text}
                      </p>
                    </div>
                  )}
                  {coachResult.explanation && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                        Explanation
                      </p>
                      <p>{coachResult.explanation}</p>
                    </div>
                  )}
                  {coachResult.examples.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                        Similar examples
                      </p>
                      <ul className="mt-2 space-y-2">
                        {coachResult.examples.map((example) => (
                          <li key={example} className="rounded-2xl bg-white/5 px-4 py-3">
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {coachResult.fluency_feedback && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                        Fluency feedback
                      </p>
                      <p>{coachResult.fluency_feedback}</p>
                    </div>
                  )}
                  {coachResult.practice_question && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                        Mini practice
                      </p>
                      <p>{coachResult.practice_question}</p>
                    </div>
                  )}
                  {coachResult.follow_up_question && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                        Next question
                      </p>
                      <p>{coachResult.follow_up_question}</p>
                    </div>
                  )}
                </div>
              )}

              {!status && activeMode === "vocabulary" && reviewResult && (
                <div className="mt-5 space-y-4 text-sm leading-7 text-stone-200">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Feedback</p>
                    <p className="mt-1 text-base text-white">{reviewResult.feedback}</p>
                  </div>
                  {reviewResult.corrected_sentence && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                        Better sentence
                      </p>
                      <p className="mt-1 text-base text-amber-300">
                        {reviewResult.corrected_sentence}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Example</p>
                    <p>{reviewResult.example}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                      Review again
                    </p>
                    <p>
                      {reviewResult.should_review_again
                        ? "Yes, keep revising this word."
                        : "No, this word is improving well."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {progress && (
              <div className="rounded-[30px] border border-stone-900/10 bg-white/85 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Next focus
                </p>
                <div className="mt-4 rounded-2xl bg-stone-50 p-4">
                  <p className="text-lg font-semibold text-stone-950 capitalize">
                    {progress.recommended_next_task.mode}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-stone-700">
                    {progress.recommended_next_task.reason}
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {progress.weak_areas.map((area) => (
                    <div key={area.area} className="rounded-2xl bg-stone-50 p-4">
                      <p className="font-semibold text-stone-950">{area.area}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        Confidence {area.confidence} · Priority {area.priority}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
