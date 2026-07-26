import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { updateAdminOrder } from "../../../../../lib/commerce/admin-order-handler";
import { databaseOrderStatusStore, findAdminOrderStatus } from "../../../../../lib/commerce/admin-orders";
import { ADMIN_COOKIE, isSameOrigin, verifyAdminToken } from "../../../../../lib/admin-security";
import type { OrderStatus } from "../../../../../lib/commerce/types";

const statuses = new Set<OrderStatus>(["paid", "awaiting_fulfillment", "shipped", "cancelled", "refund_pending", "refunded"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token) || !isSameOrigin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => undefined) as { status?: unknown; trackingNumber?: unknown } | undefined;
  const { id } = await context.params;
  const nextStatus = body?.status;
  const trackingNumber = body?.trackingNumber;
  if (typeof nextStatus !== "string" || !statuses.has(nextStatus as OrderStatus) || typeof trackingNumber !== "string") {
    return NextResponse.json({ error: "Invalid order update" }, { status: 400 });
  }

  try {
    const result = await updateAdminOrder(
      { orderId: id, nextStatus: nextStatus as OrderStatus, trackingNumber },
      { findStatus: findAdminOrderStatus, ...databaseOrderStatusStore() },
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order update failed";
    const status = message === "Order not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
