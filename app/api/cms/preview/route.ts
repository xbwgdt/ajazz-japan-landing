import { draftMode } from "next/headers";
import configPromise from "@payload-config";
import { createLocalReq, getPayload } from "payload";
import { authenticateAdmin } from "../../../../lib/cms/auth";
import { authorizeProductPreview } from "../../../../lib/cms/preview";

export async function GET(request: Request): Promise<Response> {
  const draft = await draftMode();
  const result = await authorizeProductPreview(request, {
    authenticate: authenticateAdmin,
    createRequest: createLocalReq,
    enable: () => draft.enable(),
    getPayload: () => getPayload({ config: configPromise }),
  });
  if ("code" in result) return Response.json({ code: result.code }, { status: result.status });
  return Response.redirect(new URL(result.path, request.url), 307);
}
