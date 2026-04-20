import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readAccessToken } from "@/lib/auth-session";
import { detectWeakAreas, type CoachMode } from "@/lib/coach-content";
import { generateCoachReply } from "@/lib/coach-engine";
import {
  createLearningSession,
  getAuthUser,
  getProfile,
  insertLearningEvent,
  markSessionCompleted,
  recordWeakArea,
} from "@/lib/supabase-rest";

type CoachRequest = {
  mode?: CoachMode;
  user_input?: string;
  session_id?: string | null;
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessToken(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ message: "Please log in first." }, { status: 401 });
    }

    const body = (await request.json()) as CoachRequest;
    const mode = body.mode;
    const userInput = body.user_input?.trim() ?? "";

    if (!mode || !["conversation", "grammar", "speaking"].includes(mode)) {
      return NextResponse.json({ message: "Invalid coach mode." }, { status: 400 });
    }
    if (!userInput) {
      return NextResponse.json({ message: "Please enter a sentence first." }, { status: 400 });
    }

    const authUser = await getAuthUser(accessToken);
    const profile = await getProfile(authUser.id);
    if (!profile) {
      return NextResponse.json(
        { message: "Learner profile is missing. Please sign in again." },
        { status: 409 }
      );
    }

    const reply = await generateCoachReply(mode, profile.english_level, userInput);
    const sessionId = body.session_id ?? crypto.randomUUID();

    if (!body.session_id) {
      await createLearningSession({
        id: sessionId,
        user_id: authUser.id,
        mode,
        source: reply.source,
        title: `${mode[0].toUpperCase()}${mode.slice(1)} practice`,
      });
    }

    const score = reply.corrected_text && reply.corrected_text !== userInput ? 72 : 88;

    await insertLearningEvent({
      id: crypto.randomUUID(),
      session_id: sessionId,
      event_type: "coach_feedback",
      user_input: userInput,
      agent_output: reply.reply,
      corrected_text: reply.corrected_text ?? null,
      explanation: reply.explanation ?? null,
      metrics: {
        score,
        mode,
      },
    });

    const weakAreas = detectWeakAreas(userInput, reply.corrected_text);
    await Promise.all(
      weakAreas.map((area) =>
        recordWeakArea({
          user_id: authUser.id,
          area_type: area.area_type,
          area_key: area.area_key,
          area_name: area.area_name,
          recommended_mode: area.recommended_mode,
        })
      )
    );

    await markSessionCompleted(sessionId, {
      overall_score: score,
      weak_areas: weakAreas.map((area) => area.area_name),
      recommended_next_mode: weakAreas[0]?.recommended_mode ?? mode,
    });

    return NextResponse.json({
      session_id: sessionId,
      mode,
      ...reply,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Coach request failed.",
      },
      { status: 500 }
    );
  }
}
