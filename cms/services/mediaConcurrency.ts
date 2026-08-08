import { sql } from "@payloadcms/db-postgres";
import type { Payload, PayloadRequest } from "payload";

const MEDIA_LOCK_NAMESPACE = 1_094_538_978;

type TransactionDatabase = {
  execute: (query: unknown) => Promise<unknown>;
};

export function enableTransactionalDocumentUpdates(payload: Payload): void {
  payload.db.bulkOperationsSingleTransaction = true;
}

export function normalizeMediaIds(mediaIds: Array<number | string>): number[] {
  return [...new Set(mediaIds.map((value) => Number(value)))]
    .filter((value) => Number.isSafeInteger(value) && value > 0)
    .sort((left, right) => left - right);
}

export async function lockMediaRows(
  req: PayloadRequest,
  mediaIds: Array<number | string>,
): Promise<void> {
  const ids = normalizeMediaIds(mediaIds);
  if (ids.length === 0) return;

  if (!req.transactionID) {
    throw new Error("Media concurrency guard requires an active Payload transaction");
  }
  const transactionId = String(await req.transactionID);
  const session = req.payload.db.sessions?.[transactionId];
  const database = session?.db as TransactionDatabase | undefined;
  if (!database?.execute) {
    throw new Error("Media concurrency guard requires an active Payload transaction");
  }

  for (const id of ids) {
    await database.execute(sql`SELECT pg_advisory_xact_lock(${MEDIA_LOCK_NAMESPACE}, ${id})`);
  }
}
