import { NextResponse } from "next/server";
import { APIError } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../lib/cms/auth";
import { listAdminOrders } from "../../../../../lib/commerce/admin-orders";
import { toOrderCsv } from "../../../../../lib/commerce/admin-order-export";
import { isSameOrigin } from "../../../../../lib/http-security";

export async function GET(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await requireAuthenticatedAdmin(request.headers);
  } catch (error) {
    if (error instanceof APIError && error.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
  const csv = toOrderCsv(await listAdminOrders());
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="ajazz-orders.csv"',
    },
  });
}
