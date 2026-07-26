import { commerceSql, ensureCommerceSchema } from "../commerce/db";
import type { RmsInventorySyncStore } from "./sync";

export function databaseRmsInventorySyncStore(): RmsInventorySyncStore {
  return {
    async getActiveVariantKeys() {
      await ensureCommerceSchema();
      return commerceSql()<Array<{ rms_manage_number: string; rms_sku_number: string }>>`
        SELECT p.rms_manage_number, pv.rms_sku_number
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE p.published = TRUE
      `.then((rows) => rows.map((row) => ({
        rmsManageNumber: row.rms_manage_number,
        rmsSkuNumber: row.rms_sku_number,
      })));
    },
    async setVariantInventory(record) {
      await ensureCommerceSchema();
      await commerceSql()`
        UPDATE product_variants pv
        SET available_quantity = GREATEST(${record.quantity}, 0), updated_at = NOW()
        FROM products p
        WHERE pv.product_id = p.id
          AND p.rms_manage_number = ${record.rmsManageNumber}
          AND pv.rms_sku_number = ${record.rmsSkuNumber}
      `;
    },
    async createSyncLog() {
      await ensureCommerceSchema();
      const [log] = await commerceSql()<Array<{ id: number }>>`
        INSERT INTO inventory_sync_logs (status)
        VALUES ('running')
        RETURNING id
      `;
      return log.id;
    },
    async completeSyncLog(logId, update) {
      await ensureCommerceSchema();
      await commerceSql()`
        UPDATE inventory_sync_logs
        SET completed_at = NOW(), status = ${update.status}, error_message = ${update.errorMessage ?? null}
        WHERE id = ${logId}
      `;
    },
  };
}
