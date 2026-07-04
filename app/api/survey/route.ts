import { NextRequest, NextResponse } from "next/server";
import { DatabaseNotConfiguredError, DuplicateResponseError, saveSurveyResponse } from "../../../lib/survey-db";
import { validateSurveyPayload } from "../../../lib/survey";
import {
  COMPLETED_COOKIE,
  PARTICIPANT_COOKIE,
  hashIdentifier,
  isSameOrigin,
  normalizeNameKey,
} from "../../../lib/survey-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }
  if (request.cookies.get(COMPLETED_COOKIE)) {
    return NextResponse.json({ error: "このブラウザーからは既に回答済みです。" }, { status: 409 });
  }

  const participantToken = request.cookies.get(PARTICIPANT_COOKIE)?.value;
  if (!participantToken) {
    return NextResponse.json({ error: "ページを再読み込みしてから回答してください。" }, { status: 400 });
  }

  try {
    const payload = validateSurveyPayload(await request.json());
    await saveSurveyResponse({
      name: payload.name,
      nameKey: normalizeNameKey(payload.name),
      participantHash: hashIdentifier(participantToken),
      answers: payload.answers,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COMPLETED_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.VERCEL_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof DuplicateResponseError) {
      return NextResponse.json({ error: "同じお名前、または同じブラウザーからの回答は登録済みです。" }, { status: 409 });
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "アンケートデータベースがまだ設定されていません。" }, { status: 503 });
    }
    if (error instanceof Error && error.message.startsWith("質問")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("お名前")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Survey submission failed", error);
    return NextResponse.json({ error: "送信に失敗しました。時間をおいて再度お試しください。" }, { status: 500 });
  }
}
