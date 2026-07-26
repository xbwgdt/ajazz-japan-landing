import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminToken, isSameOrigin, verifyAdminPassword } from "../../../../lib/admin-security";

export const runtime = "nodejs";

function destination(request: NextRequest, path: string) {
  return new URL(path, request.headers.get("origin") ?? request.url);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const password = String((await request.formData()).get("password") ?? "");
  try {
    if (!verifyAdminPassword(password)) {
      return NextResponse.redirect(destination(request, "/admin/login?error=password"), 303);
    }
    const response = NextResponse.redirect(destination(request, "/admin/orders"), 303);
    response.cookies.set(ADMIN_COOKIE, createAdminToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.redirect(destination(request, "/admin/login?error=config"), 303);
  }
}
