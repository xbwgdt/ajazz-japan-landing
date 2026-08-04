import { NextResponse } from "next/server";
import { APIError } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../../lib/cms/auth";
import { databaseRefundOrderStore } from "../../../../../../lib/commerce/admin-orders";
import { requestOrderRefund } from "../../../../../../lib/commerce/refunds";
import { configuredStripeRefundGateway } from "../../../../../../lib/commerce/stripe";
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
    const refund = await requestOrderRefund(id, databaseRefundOrderStore(), configuredStripeRefundGateway());
    return NextResponse.json(refund);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
