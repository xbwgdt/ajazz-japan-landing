import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isSameOrigin } from "../../../../../lib/survey-security";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const response = NextResponse.redirect(new URL("/survey/admin/login", request.headers.get("origin") ?? request.url), 303);
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
