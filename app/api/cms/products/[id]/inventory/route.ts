import configPromise from "@payload-config";
import { APIError, getPayload } from "payload";
import { requireAuthenticatedAdmin } from "../../../../../../lib/cms/auth";
import {
  InventoryAdjustmentError,
  adjustManualInventory,
  createPostgresManualInventoryStore,
  type InventoryAdjustment,
  type ManualInventoryAdjustmentInput,
} from "../../../../../../lib/cms/manual-inventory";
import { isSameOrigin } from "../../../../../../lib/http-security";

type RouteContext = { params: Promise<{ id: string }> };
type RouteActor = { id: number | string; email: string };

type RouteDependencies = {
  authenticate(headers: Headers): Promise<RouteActor>;
  adjust(input: ManualInventoryAdjustmentInput): Promise<InventoryAdjustment>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function errorResponse(error: unknown) {
  if (error instanceof InventoryAdjustmentError) {
    return Response.json({ code: error.code }, { status: error.status });
  }
  if (error instanceof APIError && error.status === 401) {
    return Response.json({ code: "unauthorized" }, { status: 401 });
  }
  return Response.json({ code: "inventory_adjustment_failed" }, { status: 500 });
}

export function createManualInventoryRouteHandler(dependencies: RouteDependencies) {
  return async function POST(request: Request, { params }: RouteContext) {
    const origin = request.headers.get("origin");
    if (!origin || !isSameOrigin(request)) {
      return Response.json({ code: "forbidden" }, { status: 403 });
    }

    try {
      const actor = await dependencies.authenticate(request.headers);
      const body = await request.json() as unknown;
      if (!isPlainObject(body)) {
        return Response.json({ code: "invalid_json_body" }, { status: 400 });
      }
      const allowedKeys = new Set(["variantId", "quantity", "reason"]);
      if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
        return Response.json({ code: "invalid_json_body" }, { status: 400 });
      }

      const { id } = await params;
      if (!/^[1-9]\d*$/.test(id) || typeof body.variantId !== "number") {
        return Response.json({ code: "invalid_inventory_target" }, { status: 400 });
      }
      const result = await dependencies.adjust({
        productId: Number(id),
        variantId: Number(body.variantId),
        quantity: body.quantity as number,
        reason: body.reason as string,
        actor,
      });
      return Response.json(result);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return Response.json({ code: "invalid_json" }, { status: 400 });
      }
      return errorResponse(error);
    }
  };
}

export const POST = createManualInventoryRouteHandler({
  async authenticate(headers) {
    const payload = await getPayload({ config: configPromise });
    return requireAuthenticatedAdmin(headers, payload);
  },
  adjust(input) {
    return adjustManualInventory(input, createPostgresManualInventoryStore());
  },
});
