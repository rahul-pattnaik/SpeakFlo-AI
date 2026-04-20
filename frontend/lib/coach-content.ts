export type CoachMode = "conversation" | "grammar" | "speaking";

export type CoachResult = {
  reply: string;
  corrected_text?: string | null;
  explanation?: string | null;
  examples?: string[];
  follow_up_question?: string | null;
  practice_question?: string | null;
  fluency_feedback?: string | null;
  source: string;
};

export type VocabularyWord = {
  word: string;
  meaning: string;
  example: string;
  learner_prompt: string;
  revision_hint: string;
  is_weak: boolean;
};

const vocabularyBank: Record<string, Array<[string, string, string]>> = {
  Beginner: [
    ["fresh", "recently made or picked; not old", "These vegetables are fresh from the farm."],
    ["basket", "a container used to carry things", "She put tomatoes in her basket."],
    ["vendor", "a person who sells things", "The vendor smiled and showed the prices."],
    ["bargain", "a good deal at a low price", "I found a bargain on green chilies."],
    ["carry", "to hold and take something somewhere", "I carried the bag home carefully."],
    ["choose", "to pick one thing from many options", "Please choose the ripest bananas."],
    ["crowded", "full of many people", "The market was crowded in the evening."],
  ],
  Intermediate: [
    ["purchase", "to buy something", "She purchased vegetables for the whole week."],
    ["affordable", "not too expensive", "The fruit at this shop is affordable."],
    ["arrange", "to put things in order", "The shopkeeper arranged the vegetables neatly."],
    ["compare", "to look at differences between things", "I compare prices before I buy."],
    ["seasonal", "available during a particular time of year", "Mangoes are seasonal fruits."],
    ["negotiate", "to discuss in order to reach an agreement", "He negotiated the final price politely."],
    ["ingredient", "an item used to make a dish", "Onions are an important ingredient in this curry."],
  ],
  Advanced: [
    ["nourishing", "helpful for health and growth", "A nourishing meal starts with good produce."],
    ["meticulous", "very careful and precise", "She was meticulous when selecting vegetables."],
    ["evaluate", "to judge the quality or value of something", "Consumers evaluate freshness before paying."],
    ["abundant", "available in large amounts", "Fresh herbs were abundant in the market today."],
    ["sustainable", "able to continue without harming the future", "We should support sustainable farming."],
    ["procure", "to obtain something with effort", "Restaurants procure vegetables every morning."],
    ["versatile", "useful in many different ways", "Potatoes are versatile ingredients in cooking."],
  ],
};

export function buildDailyWords(level: string, revisionWords: string[]) {
  const bank = vocabularyBank[level] ?? vocabularyBank.Beginner;
  const offset = new Date().getDate() % bank.length;

  return Array.from({ length: 5 }, (_, index) => {
    const [word, meaning, example] = bank[(offset + index) % bank.length];
    return {
      word,
      meaning,
      example,
      learner_prompt: `What does '${word}' mean in easy English?`,
      revision_hint: `Make your own sentence with '${word}'.`,
      is_weak: revisionWords.includes(word),
    } satisfies VocabularyWord;
  });
}

export function cleanupSentence(sentence: string) {
  const normalized = sentence.trim().replace(/\s+/g, " ");
  let fixed = normalized
    .replace(/\bwent market\b/gi, "went to the market")
    .replace(/\bbuy vegetables\b/gi, "bought vegetables")
    .replace(/\bgo school\b/gi, "went to school")
    .replace(/\bmeet teacher\b/gi, "met the teacher");

  if (fixed.length > 0) {
    fixed = fixed[0].toUpperCase() + fixed.slice(1);
  }

  if (fixed && !/[.!?]$/.test(fixed)) {
    fixed = `${fixed}.`;
  }

  return fixed;
}

export function fallbackCoach(mode: CoachMode, userInput: string): CoachResult {
  const corrected = cleanupSentence(userInput);

  if (mode === "conversation") {
    return {
      reply: `Good try. A better sentence is: '${corrected}'`,
      corrected_text: corrected,
      explanation:
        "Use the right preposition for places and the past tense when the action already happened.",
      follow_up_question: "What did you buy there?",
      source: "local-fallback",
    };
  }

  if (mode === "grammar") {
    return {
      reply: `Let's improve it: '${corrected}'`,
      corrected_text: corrected,
      explanation:
        "Your idea is clear. The main fix is using the correct past tense and adding the missing small grammar words.",
      examples: [
        "Yesterday I went to the park and met my friend.",
        "Last night she cooked dinner and watched a movie.",
      ],
      practice_question:
        "Change this into correct past tense: 'Today I go school and meet teacher.'",
      source: "local-fallback",
    };
  }

  return {
    reply: `I understood your idea well. A smoother version is: '${corrected}'`,
    corrected_text: corrected,
    explanation: "Try speaking in short chunks and use the past tense clearly.",
    fluency_feedback:
      "Your message is understandable. Work on past tense and linking words like 'to' and 'and'.",
    follow_up_question: "Can you say the same idea again in one smooth sentence?",
    source: "local-fallback",
  };
}

export function fallbackVocabularyReview(word: string, sentence: string) {
  const corrected = cleanupSentence(sentence);
  const shouldReviewAgain =
    corrected.toLocaleLowerCase() !== sentence.trim().toLocaleLowerCase();

  return {
    feedback: `Nice effort. Your sentence with '${word}' is close, and this version sounds more natural.`,
    corrected_sentence: corrected,
    example: `I used the word '${word}' in my English practice today.`,
    should_review_again: shouldReviewAgain,
    source: "local-fallback",
  };
}

export function detectWeakAreas(userInput: string, correctedText?: string | null) {
  const input = userInput.toLowerCase();
  const corrected = (correctedText ?? "").toLowerCase();
  const items: Array<{
    area_type: string;
    area_key: string;
    area_name: string;
    recommended_mode: string;
  }> = [];

  if (input.includes("buy ") && corrected.includes("bought")) {
    items.push({
      area_type: "grammar",
      area_key: "past-tense",
      area_name: "Past Tense",
      recommended_mode: "grammar",
    });
  }

  if (
    input.includes("went market") ||
    (corrected.includes("to the market") && !input.includes("to the market"))
  ) {
    items.push({
      area_type: "grammar",
      area_key: "prepositions",
      area_name: "Prepositions",
      recommended_mode: "grammar",
    });
  }

  return items;
}
