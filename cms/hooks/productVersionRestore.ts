import { APIError, type CollectionBeforeOperationHook } from "payload";
import { lockProduct } from "../services/productConcurrency";

export const prepareProductVersionRestore: CollectionBeforeOperationHook = async ({ args, operation }) => {
  if (operation !== "restoreVersion") return args;
  if (!args.req.user) throw new APIError("Unauthorized", 401);
  if (args.draft !== true) {
    throw new APIError("Product versions can only be restored as drafts", 400, {
      code: "product_restore_requires_draft",
    });
  }

  const versions = await args.req.payload.db.findVersions({
    collection: "products",
    limit: 1,
    locale: "all",
    pagination: false,
    req: args.req,
    where: { id: { equals: args.id } },
  });
  const parent = versions.docs[0]?.parent;
  if (typeof parent !== "string" && typeof parent !== "number") {
    throw new APIError("Product version not found", 404);
  }

  await lockProduct(args.req, parent);
  args.req.context.productRestore = { productId: String(parent) };
  return args;
};
