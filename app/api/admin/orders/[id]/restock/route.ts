import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseReturnRestockStore } from "../../../../../../lib/commerce/admin-orders";
import { restockReturnedOrder } from "../../../../../../lib/commerce/returns";
import { ADMIN_COOKIE, isSameOrigin, verifyAdminToken } from "../../../../../../lib/admin-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token) || !isSameOrigin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    return NextResponse.json(await restockReturnedOrder(id, databaseReturnRestockStore()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Restock failed" }, { status: 400 });
  }
}
