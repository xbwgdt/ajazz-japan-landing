import configPromise from "@payload-config";
import { getPayload } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../../lib/cms/auth";
import {
  archiveProduct,
  createPayloadProductLifecycleStore,
  createProductLifecycleRouteHandler,
} from "../../../../../../lib/cms/product-lifecycle";

export const POST = createProductLifecycleRouteHandler({
  async authenticate(headers) {
    const payload = await getPayload({ config: configPromise });
    return requireAuthenticatedAdmin(headers, payload);
  },
  async archive(id, actor, confirmation) {
    const payload = await getPayload({ config: configPromise });
    return archiveProduct(id, actor, confirmation, createPayloadProductLifecycleStore(payload));
  },
  async remove() {},
  async restore() {},
}, "archive");
