import configPromise from "@payload-config";
import { getPayload } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../../lib/cms/auth";
import {
  createPayloadProductLifecycleStore,
  createProductLifecycleRouteHandler,
  deleteUnreferencedDraft,
} from "../../../../../../lib/cms/product-lifecycle";

export const POST = createProductLifecycleRouteHandler({
  async authenticate(headers) {
    const payload = await getPayload({ config: configPromise });
    return requireAuthenticatedAdmin(headers, payload);
  },
  async archive() {},
  async remove(id, actor, confirmation) {
    const payload = await getPayload({ config: configPromise });
    return deleteUnreferencedDraft(id, actor, confirmation, createPayloadProductLifecycleStore(payload));
  },
  async restore() {},
}, "delete");
