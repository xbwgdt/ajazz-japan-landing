import { NextRequest, NextResponse } from "next/server";

const PARTICIPANT_COOKIE = "survey_participant";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get(PARTICIPANT_COOKIE)) {
    response.cookies.set(PARTICIPANT_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.VERCEL_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/survey/:path*"],
};
