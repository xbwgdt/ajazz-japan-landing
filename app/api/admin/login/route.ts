import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminToken, isSameOrigin, verifyAdminPassword } from "../../../../lib/admin-security";
import {
  adminLoginClientKey,
  assessAdminLogin,
  databaseAdminLoginAttemptStore,
} from "../../../../lib/admin-login-throttle";

export const runtime = "nodejs";

function destination(request: NextRequest, path: string) {
  return new URL(path, request.headers.get("origin") ?? request.url);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const password = String((await request.formData()).get("password") ?? "");
  try {
    const decision = await assessAdminLogin(
      adminLoginClientKey(request),
      verifyAdminPassword(password),
      databaseAdminLoginAttemptStore(),
    );
    if (decision.status === "blocked") {
      return NextResponse.redirect(destination(request, "/admin/login?error=rate"), 303);
    }
    if (decision.status === "invalid") {
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
