import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listAdminOrders } from "../../../../../lib/commerce/admin-orders";
import { toOrderCsv } from "../../../../../lib/commerce/admin-order-export";
import { ADMIN_COOKIE, verifyAdminToken } from "../../../../../lib/survey-security";

export async function GET() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const csv = toOrderCsv(await listAdminOrders());
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="ajazz-orders.csv"',
    },
  });
}
