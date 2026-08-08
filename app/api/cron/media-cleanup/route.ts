import configPromise from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import {
  cleanupRetiredMedia,
  deleteR2MediaObject,
} from "../../../../cms/hooks/protectMediaReferences";
import { hasValidCronAuthorization } from "../../../../lib/commerce/cron";

export async function GET(request: Request) {
  if (!hasValidCronAuthorization(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await getPayload({ config: configPromise });
  const result = await cleanupRetiredMedia({ deleteObject: deleteR2MediaObject, payload });
  return NextResponse.json(result, { status: result.failed > 0 ? 503 : 200 });
}
