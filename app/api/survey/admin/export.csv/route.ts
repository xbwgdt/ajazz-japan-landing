import { NextRequest, NextResponse } from "next/server";
import { exportHeaders, exportRows } from "../../../../../lib/survey";
import { DatabaseNotConfiguredError, listSurveyResponses } from "../../../../../lib/survey-db";
import { ADMIN_COOKIE, verifyAdminToken } from "../../../../../lib/survey-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.redirect(new URL("/survey/admin/login", request.url));
  }
  try {
    const rows = await listSurveyResponses();
    const csv = [exportHeaders(), ...exportRows([...rows].reverse())]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="survey-responses.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof DatabaseNotConfiguredError ? "Database is not configured" : "Export failed";
    return new NextResponse(message, { status: 503 });
  }
}
