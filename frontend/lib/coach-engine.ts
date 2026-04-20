import "server-only";

import {
  CoachMode,
  CoachResult,
  fallbackCoach,
  fallbackVocabularyReview,
} from "@/lib/coach-content";
import { getOpenAIApiKey, getOpenAIModel } from "@/lib/server-env";

async function fetchOpenAIJson(instructions: string, userInput: string) {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      input: [
        { role: "system", content: instructions },
        { role: "user", content: userInput },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const outputText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;

  if (!outputText) {
    return null;
  }

  try {
    return JSON.parse(outputText) as Record<string, unknown>;
  } catch {
    const start = outputText.indexOf("{");
    const end = outputText.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(outputText.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export async function generateCoachReply(
  mode: CoachMode,
  level: string,
  userInput: string
): Promise<CoachResult> {
  const fallback = fallbackCoach(mode, userInput);

  const instructionMap: Record<CoachMode, string> = {
    conversation:
      "You are SpeakFlo AI, a warm English coach for Indian learners. Reply naturally, softly correct the sentence, explain the correction in easy English, and ask one follow-up question. Return strict JSON with keys: reply, corrected_text, explanation, follow_up_question.",
    grammar:
      "You are SpeakFlo AI in grammar mode. Check the sentence, explain the mistake in easy English, provide exactly two similar examples, and give one short practice question. Return strict JSON with keys: reply, corrected_text, explanation, examples, practice_question.",
    speaking:
      "You are SpeakFlo AI in speaking mode. The text is a speech transcript. Analyze grammar and fluency, suggest a smoother corrected version, explain briefly, and ask one next speaking prompt. Return strict JSON with keys: reply, corrected_text, explanation, fluency_feedback, follow_up_question.",
  };

  const result = await fetchOpenAIJson(
    instructionMap[mode],
    `Learner level: ${level}\nLearner input: ${userInput}`
  );

  if (!result) {
    return fallback;
  }

  return {
    reply: String(result.reply ?? fallback.reply),
    corrected_text:
      typeof result.corrected_text === "string"
        ? result.corrected_text
        : fallback.corrected_text,
    explanation:
      typeof result.explanation === "string"
        ? result.explanation
        : fallback.explanation,
    examples: Array.isArray(result.examples)
      ? result.examples.map(String)
      : fallback.examples,
    follow_up_question:
      typeof result.follow_up_question === "string"
        ? result.follow_up_question
        : fallback.follow_up_question,
    practice_question:
      typeof result.practice_question === "string"
        ? result.practice_question
        : fallback.practice_question,
    fluency_feedback:
      typeof result.fluency_feedback === "string"
        ? result.fluency_feedback
        : fallback.fluency_feedback,
    source: "openai",
  };
}

export async function generateVocabularyReview(
  level: string,
  payload: { word: string; userMeaning?: string; userSentence: string; confident: boolean }
) {
  const fallback = fallbackVocabularyReview(payload.word, payload.userSentence);
  const result = await fetchOpenAIJson(
    "You are SpeakFlo AI, an English coach for Indian learners. Review the learner's vocabulary usage and return strict JSON with keys: feedback, corrected_sentence, example, should_review_again. Use easy English and be concise.",
    `Learner level: ${level}\nWord: ${payload.word}\nMeaning attempt: ${payload.userMeaning ?? "not provided"}\nSentence: ${payload.userSentence}\nConfidence: ${payload.confident ? "high" : "low"}`
  );

  if (!result) {
    return fallback;
  }

  return {
    feedback: String(result.feedback ?? fallback.feedback),
    corrected_sentence:
      typeof result.corrected_sentence === "string"
        ? result.corrected_sentence
        : fallback.corrected_sentence,
    example: String(result.example ?? fallback.example),
    should_review_again:
      typeof result.should_review_again === "boolean"
        ? result.should_review_again
        : fallback.should_review_again,
    source: "openai",
  };
}
