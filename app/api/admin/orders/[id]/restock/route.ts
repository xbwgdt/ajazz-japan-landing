import { NextResponse } from "next/server";
import { APIError } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../../lib/cms/auth";
import { databaseReturnRestockStore } from "../../../../../../lib/commerce/admin-orders";
import { restockReturnedOrder } from "../../../../../../lib/commerce/returns";
import { isSameOrigin } from "../../../../../../lib/http-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await requireAuthenticatedAdmin(request.headers);
  } catch (error) {
    if (error instanceof APIError && error.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
  try {
    const { id } = await context.params;
    return NextResponse.json(await restockReturnedOrder(id, databaseReturnRestockStore()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Restock failed" }, { status: 400 });
  }
}
