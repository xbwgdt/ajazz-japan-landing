import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { databaseRefundOrderStore } from "../../../../../../lib/commerce/admin-orders";
import { requestOrderRefund } from "../../../../../../lib/commerce/refunds";
import { configuredStripeRefundGateway } from "../../../../../../lib/commerce/stripe";
import { ADMIN_COOKIE, isSameOrigin, verifyAdminToken } from "../../../../../../lib/survey-security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token) || !isSameOrigin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const refund = await requestOrderRefund(id, databaseRefundOrderStore(), configuredStripeRefundGateway());
    return NextResponse.json(refund);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
