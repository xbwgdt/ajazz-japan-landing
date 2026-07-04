import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminToken, isSameOrigin, verifyAdminPassword } from "../../../../../lib/survey-security";

export const runtime = "nodejs";

function destination(request: NextRequest, path: string) {
  return new URL(path, request.headers.get("origin") ?? request.url);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  try {
    if (!verifyAdminPassword(password)) {
      return NextResponse.redirect(destination(request, "/survey/admin/login?error=password"), 303);
    }
    const response = NextResponse.redirect(destination(request, "/survey/admin"), 303);
    response.cookies.set(ADMIN_COOKIE, createAdminToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.VERCEL_ENV === "production",
      maxAge: 8 * 60 * 60,
      path: "/survey/admin",
    });
    return response;
  } catch {
    return NextResponse.redirect(destination(request, "/survey/admin/login?error=config"), 303);
  }
}
