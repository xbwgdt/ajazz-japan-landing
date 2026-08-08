import {
  APIError,
  restoreVersionOperation,
  type PayloadRequest,
} from "payload";
import { isSameOrigin } from "../../lib/http-security";

type RestoreProductVersionOperation = typeof restoreVersionOperation;

export async function restoreProductVersionEndpoint(
  req: PayloadRequest,
  dependencies: { restore?: RestoreProductVersionOperation } = {},
): Promise<Response> {
  if (!req.user) throw new APIError("Unauthorized", 401);
  if (
    !req.url
    || !req.headers.get("origin")
    || !isSameOrigin({ headers: req.headers, url: req.url })
  ) {
    throw new APIError("Forbidden", 403, { code: "forbidden" });
  }

  const versionId = req.routeParams?.id;
  if (typeof versionId !== "string" || !versionId) {
    throw new APIError("Product version ID is required", 400, {
      code: "product_version_id_required",
    });
  }
  const collection = req.payload.collections.products;
  if (!collection) throw new APIError("Products collection is unavailable", 500);

  // Payload 3.87's Local API drops the draft option. Invoke the same operation
  // used by its REST handler so draft=true reaches beforeOperation and draftArg.
  const result = await (dependencies.restore ?? restoreVersionOperation)({
    collection,
    draft: true,
    id: versionId,
    overrideAccess: false,
    req,
  });

  return Response.json({
    ...result,
    message: req.t("version:restoredSuccessfully"),
  });
}
