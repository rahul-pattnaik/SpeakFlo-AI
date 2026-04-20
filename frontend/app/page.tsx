import Link from "next/link";

const featureCards = [
  {
    title: "Conversation coaching",
    description:
      "Learners speak or type naturally and receive soft corrections, simple explanations, and follow-up questions.",
  },
  {
    title: "Vocabulary memory",
    description:
      "Daily words, learner-made sentences, and weak-word revision are tracked so practice compounds over time.",
  },
  {
    title: "Grammar in easy English",
    description:
      "Mistakes are explained clearly with examples and mini practice instead of classroom-style jargon.",
  },
  {
    title: "Speaking-ready architecture",
    description:
      "Start with transcript-first speaking feedback now and grow toward richer voice practice later.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff0cc_0%,#f7efe2_38%,#dfe9f6_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[36px] border border-stone-900/10 bg-white/75 shadow-[0_30px_90px_rgba(65,48,12,0.12)] backdrop-blur">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                SpeakFlo AI
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
                A practical English coach built for daily speaking confidence.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
                SpeakFlo helps learners improve through guided conversation, vocabulary,
                grammar, and speaking feedback, without the cost and complexity of a heavy
                backend stack.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-stone-950 px-6 py-3 font-semibold text-white transition hover:bg-amber-700"
                >
                  Create free account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-stone-900/10 bg-white px-6 py-3 font-semibold text-stone-900 transition hover:border-stone-950"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="rounded-[32px] bg-stone-950 p-8 text-stone-50">
              <p className="text-sm uppercase tracking-[0.2em] text-amber-300">
                Learner journey
              </p>
              <div className="mt-6 space-y-4">
                {[
                  "Create account with Supabase Auth",
                  "Start a learning session in one click",
                  "Get structured AI feedback with corrections and explanations",
                  "Save progress, weak areas, and revision words automatically",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-stone-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[28px] border border-stone-900/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(66,45,9,0.08)]"
            >
              <h2 className="text-xl font-semibold text-stone-950">{card.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{card.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
