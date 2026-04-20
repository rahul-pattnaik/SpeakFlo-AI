import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { readAccessToken } from "@/lib/auth-session";
import { getAuthUser, getProgressData } from "@/lib/supabase-rest";

function isSameDay(isoDate: string, now: Date) {
  const date = new Date(isoDate);
  return date.toDateString() === now.toDateString();
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = readAccessToken(cookieStore);
    if (!accessToken) {
      return NextResponse.json({ message: "Please log in first." }, { status: 401 });
    }

    const authUser = await getAuthUser(accessToken);
    const { sessions, weakAreas, vocabularyReviews } = await getProgressData(authUser.id);
    const now = new Date();

    const completedSessions = sessions.filter((session) => session.status === "completed");
    const sessionsToday = completedSessions.filter((session) =>
      isSameDay(String(session.ended_at ?? session.created_at), now)
    );
    const vocabularyToday = vocabularyReviews.filter((review) =>
      isSameDay(String(review.created_at), now)
    );
    const practiceMinutesToday = Math.max(sessionsToday.length * 8, vocabularyToday.length * 2);

    const speakingSessions = completedSessions.filter((session) => session.mode === "speaking");
    const grammarSessions = completedSessions.filter((session) => session.mode === "grammar");
    const vocabularySessions = completedSessions.filter(
      (session) => session.mode === "vocabulary"
    );

    const speakingScore = speakingSessions.length > 0 ? 68 : 60;
    const grammarScore = grammarSessions.length > 0 ? 76 : 62;
    const vocabularyScore = vocabularySessions.length > 0 ? 79 : 64;
    const fluencyScore = speakingSessions.length > 0 ? 66 : 58;
    const overallScore = Math.round(
      grammarScore * 0.35 + vocabularyScore * 0.35 + speakingScore * 0.3
    );

    const topWeakAreas = weakAreas
      .sort((a, b) => Number(b.error_count ?? 0) - Number(a.error_count ?? 0))
      .slice(0, 3)
      .map((area) => ({
        area: area.area_name,
        confidence: area.confidence_score,
        priority: Math.min(10, Number(area.error_count ?? 1) + 3),
        recommended_mode: area.recommended_mode,
      }));

    return NextResponse.json({
      daily_stats: {
        practice_minutes_today: practiceMinutesToday,
        sessions_completed_today: sessionsToday.length,
        words_reviewed_today: vocabularyToday.length,
        streak: completedSessions.length > 0 ? Math.min(14, completedSessions.length) : 0,
      },
      weekly_stats: {
        practice_minutes: completedSessions.length * 8 + vocabularyReviews.length * 2,
        days_practiced: Math.min(7, completedSessions.length),
        sessions_completed: completedSessions.length,
        words_reviewed: vocabularyReviews.length,
      },
      overall_stats: {
        total_practice_hours: Number(
          ((completedSessions.length * 8 + vocabularyReviews.length * 2) / 60).toFixed(1)
        ),
        total_sessions_completed: completedSessions.length,
        total_words_reviewed: vocabularyReviews.length,
        weak_words_count: weakAreas.filter((area) => area.area_type === "vocabulary").length,
        overall_score: overallScore,
      },
      skill_scores: {
        speaking: speakingScore,
        grammar: grammarScore,
        vocabulary: vocabularyScore,
        fluency: fluencyScore,
      },
      level_progression: {
        current_level: "beginner",
        progress_percentage: Math.min(95, 18 + completedSessions.length * 4),
        estimated_days_to_next_level: Math.max(5, 30 - completedSessions.length),
      },
      weak_areas: topWeakAreas,
      recommended_next_task: topWeakAreas[0]
        ? {
            mode: topWeakAreas[0].recommended_mode,
            reason: `Focus on ${topWeakAreas[0].area} next.`,
          }
        : {
            mode: "conversation",
            reason: "Start a conversation session to build your first streak.",
          },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not load progress dashboard.",
      },
      { status: 500 }
    );
  }
}
