import configPromise from "@payload-config";
import { getPayload } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../../lib/cms/auth";
import {
  createPayloadProductLifecycleStore,
  createProductLifecycleRouteHandler,
  restoreProductAsDraft,
} from "../../../../../../lib/cms/product-lifecycle";

export const POST = createProductLifecycleRouteHandler({
  async authenticate(headers) {
    const payload = await getPayload({ config: configPromise });
    return requireAuthenticatedAdmin(headers, payload);
  },
  async archive() {},
  async remove() {},
  async restore(id, actor) {
    const payload = await getPayload({ config: configPromise });
    return restoreProductAsDraft(id, actor, createPayloadProductLifecycleStore(payload));
  },
}, "restore");
