import { sql } from "@payloadcms/db-postgres";
import type { CollectionBeforeOperationHook, PayloadRequest } from "payload";

const PRODUCT_LOCK_NAMESPACE = 1_342_172_273;

type TransactionDatabase = {
  execute: (query: unknown) => Promise<unknown>;
};

export async function lockProduct(
  req: PayloadRequest,
  productId: number | string,
): Promise<void> {
  if (!req.transactionID) {
    throw new Error("Product concurrency guard requires an active Payload transaction");
  }
  const transactionId = String(await req.transactionID);
  const session = req.payload.db.sessions?.[transactionId];
  const database = session?.db as TransactionDatabase | undefined;
  if (!database?.execute) {
    throw new Error("Product concurrency guard requires an active Payload transaction");
  }

  await database.execute(sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${String(productId)}, ${PRODUCT_LOCK_NAMESPACE})
    )
  `);
}

export const lockSingleProductOperation: CollectionBeforeOperationHook = async ({ args, operation }) => {
  if (
    (operation === "update" || operation === "delete")
    && "id" in args
    && (typeof args.id === "string" || typeof args.id === "number")
  ) {
    await lockProduct(args.req, args.id);
  }
  return args;
};
