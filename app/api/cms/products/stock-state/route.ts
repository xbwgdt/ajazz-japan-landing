import configPromise from "@payload-config";
import { getPayload } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../lib/cms/auth";
import { createStockStateRouteHandler, findCmsProductIdsForStockState } from "../../../../../lib/cms/stock-state-filter";
import { commerceSql } from "../../../../../lib/commerce/db";

export const GET = createStockStateRouteHandler({
  async authenticate(headers) {
    const payload = await getPayload({ config: configPromise });
    await requireAuthenticatedAdmin(headers, payload);
  },
  findIds(state) {
    return findCmsProductIdsForStockState(commerceSql(), state);
  },
});
