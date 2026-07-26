import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isSameOrigin } from "../../../../lib/admin-security";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const response = NextResponse.redirect(new URL("/admin/login", request.headers.get("origin") ?? request.url), 303);
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
