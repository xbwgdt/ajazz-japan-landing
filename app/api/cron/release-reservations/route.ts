import { NextResponse } from "next/server";
import { hasValidCronAuthorization } from "../../../../lib/commerce/cron";
import { releaseExpiredReservations } from "../../../../lib/commerce/reservation-cleanup";

export async function GET(request: Request) {
  if (!hasValidCronAuthorization(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const released = await releaseExpiredReservations();
  return NextResponse.json({ released });
}
