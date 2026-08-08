import configPromise from "@payload-config";
import { APIError, getPayload } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../../lib/cms/auth";
import { executePublicationAction, publicationErrorResponse } from "../../../../../../lib/cms/publication-route";
import { isSameOrigin } from "../../../../../../lib/http-security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!request.headers.get("origin") || !isSameOrigin(request)) return Response.json({ code: "forbidden" }, { status: 403 });
  const payload = await getPayload({ config: configPromise });
  try {
    const admin = await requireAuthenticatedAdmin(request.headers, payload);
    const body = await request.json() as { expectedRevision?: unknown };
    if (!Number.isInteger(body.expectedRevision)) return Response.json({ code: "expected_revision_required" }, { status: 400 });
    const { id } = await params;
    const result = await executePublicationAction({ action: "unpublish", admin, expectedRevision: body.expectedRevision as number, payload, productId: id });
    return Response.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ code: "invalid_json" }, { status: 400 });
    if (error instanceof APIError && error.status === 401) return Response.json({ code: "unauthorized" }, { status: 401 });
    return publicationErrorResponse(error);
  }
}
