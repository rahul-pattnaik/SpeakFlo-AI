import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readAccessToken } from "@/lib/auth-session";
import { generateVocabularyReview } from "@/lib/coach-engine";
import {
  getAuthUser,
  getProfile,
  getRevisionWords,
  insertVocabularyReview,
  recordWeakArea,
} from "@/lib/supabase-rest";

type ReviewRequest = {
  word?: string;
  user_meaning?: string;
  user_sentence?: string;
  confident?: boolean;
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessToken(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ message: "Please log in first." }, { status: 401 });
    }

    const body = (await request.json()) as ReviewRequest;
    const word = body.word?.trim() ?? "";
    const userSentence = body.user_sentence?.trim() ?? "";
    const userMeaning = body.user_meaning?.trim() ?? "";
    const confident = Boolean(body.confident);

    if (!word || !userSentence) {
      return NextResponse.json(
        { message: "Word and learner sentence are required." },
        { status: 400 }
      );
    }

    const authUser = await getAuthUser(accessToken);
    const profile = await getProfile(authUser.id);
    if (!profile) {
      return NextResponse.json(
        { message: "Learner profile is missing. Please sign in again." },
        { status: 409 }
      );
    }

    const result = await generateVocabularyReview(profile.english_level, {
      word,
      userMeaning,
      userSentence,
      confident,
    });

    await insertVocabularyReview({
      id: crypto.randomUUID(),
      user_id: authUser.id,
      word,
      user_meaning: userMeaning || null,
      user_sentence: userSentence,
      corrected_sentence: result.corrected_sentence ?? null,
      needs_review: result.should_review_again,
      learner_confident: confident,
    });

    if (result.should_review_again) {
      await recordWeakArea({
        user_id: authUser.id,
        area_type: "vocabulary",
        area_key: word.toLowerCase(),
        area_name: word,
        recommended_mode: "vocabulary",
      });
    }

    const revisionWords = await getRevisionWords(authUser.id);

    return NextResponse.json({
      word,
      feedback: result.feedback,
      corrected_sentence: result.corrected_sentence ?? null,
      example: result.example,
      should_review_again: result.should_review_again,
      revision_words: revisionWords,
      source: result.source,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Vocabulary review failed.",
      },
      { status: 500 }
    );
  }
}
