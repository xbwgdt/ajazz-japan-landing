import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { buildSurveyStats, exportHeaders, exportRows } from "../../../../../lib/survey";
import { DatabaseNotConfiguredError, listSurveyResponses } from "../../../../../lib/survey-db";
import { ADMIN_COOKIE, verifyAdminToken } from "../../../../../lib/survey-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.redirect(new URL("/survey/admin/login", request.url));
  }

  try {
    const rows = await listSurveyResponses();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AJAZZ Japan";
    workbook.created = new Date();

    const detail = workbook.addWorksheet("回答データ", { views: [{ state: "frozen", ySplit: 1 }] });
    detail.addRow(exportHeaders());
    for (const row of exportRows([...rows].reverse())) detail.addRow(row);
    detail.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + exportHeaders().length)}1` };

    const summary = workbook.addWorksheet("集計", { views: [{ state: "frozen", ySplit: 1 }] });
    summary.addRow(["質問", "選択肢", "回答数", "割合"]);
    for (const question of buildSurveyStats(rows)) {
      for (const option of question.options) {
        summary.addRow([question.title, option.label, option.count, option.ratio]);
      }
    }
    summary.getColumn(1).width = 52;
    summary.getColumn(2).width = 62;
    summary.getColumn(3).width = 12;
    summary.getColumn(4).width = 12;
    summary.getColumn(4).numFmt = "0.0%";

    for (const sheet of [detail, summary]) {
      const header = sheet.getRow(1);
      header.height = 28;
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
      header.alignment = { vertical: "middle" };
    }
    exportHeaders().forEach((header, index) => {
      detail.getColumn(index + 1).width = Math.min(Math.max(header.length + 4, 14), 54);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="survey-responses.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof DatabaseNotConfiguredError ? "Database is not configured" : "Export failed";
    return new NextResponse(message, { status: 503 });
  }
}
