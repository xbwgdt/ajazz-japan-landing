import configPromise from "@payload-config";
import { getPayload, type Payload } from "payload";
import { commerceSql } from "../commerce/db";

export type DashboardProduct = { id: string; name: string; slug: string; updatedAt?: string };
export type DashboardAuditEvent = { action: string; createdAt?: string; subjectId: string; subjectType?: string };

export type AdminDashboardSnapshot = {
  archivedCount: number;
  draftCount: number;
  latestRmsSync: { completedAt: string; updatedCount: number } | null;
  outOfStockCount: number;
  pendingPublicationProducts: DashboardProduct[];
  publishedCount: number;
  recentAuditEvents: DashboardAuditEvent[];
  recentEdits: DashboardProduct[];
  rmsFailureSummary: { completedAt: string; failedCount: number } | null;
  totalCount: number;
};

export interface AdminDashboardStore {
  getSnapshot(): Promise<AdminDashboardSnapshot>;
}

type CountResult = { totalDocs: number };
type CommerceRow = Record<string, unknown>;

function asDateString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function createPayloadAdminDashboardStore(payload: Payload): AdminDashboardStore {
  return {
    async getSnapshot() {
      const [total, draft, published, archived, pending, recentEdits, recentAudits, commerce] = await Promise.all([
        payload.count({ collection: "products", overrideAccess: true }),
        payload.count({
          collection: "products",
          overrideAccess: true,
          where: { and: [{ _status: { equals: "draft" } }, { lifecycle: { equals: "unpublished" } }] },
        }),
        payload.count({ collection: "products", overrideAccess: true, where: { _status: { equals: "published" } } }),
        payload.count({ collection: "products", overrideAccess: true, where: { lifecycle: { equals: "archived" } } }),
        payload.find({
          collection: "products",
          depth: 0,
          limit: 10,
          overrideAccess: true,
          sort: "-updatedAt",
          where: { and: [{ _status: { equals: "draft" } }, { lifecycle: { equals: "unpublished" } }] },
        }),
        payload.find({ collection: "products", depth: 0, limit: 10, overrideAccess: true, sort: "-updatedAt" }),
        payload.find({
          collection: "audit-events",
          depth: 0,
          limit: 20,
          overrideAccess: true,
          sort: "-createdAt",
          where: { action: { in: ["publish", "unpublish", "approve_price", "archive", "restore", "adjust_inventory", "retire_media"] } },
        }),
        Promise.all([
          commerceSql()<CommerceRow[]>`
            SELECT COUNT(DISTINCT p.cms_product_id) AS out_of_stock_count
            FROM public.products p
            JOIN public.product_variants pv ON pv.product_id = p.id
            WHERE p.cms_product_id IS NOT NULL AND pv.active = TRUE AND pv.available_quantity <= 0
          `,
          commerceSql()<CommerceRow[]>`
            SELECT completed_at, updated_count
            FROM public.inventory_sync_logs
            WHERE status = 'completed'
            ORDER BY completed_at DESC NULLS LAST, id DESC
            LIMIT 1
          `,
          commerceSql()<CommerceRow[]>`
            SELECT completed_at, failed_count
            FROM public.inventory_sync_logs
            WHERE status <> 'completed' OR failed_count > 0
            ORDER BY completed_at DESC NULLS LAST, id DESC
            LIMIT 1
          `,
        ]),
      ]);
      const [outOfStockRows, latestRmsRows, rmsFailureRows] = commerce;

      const productSummary = (product: Record<string, unknown>): DashboardProduct => ({
        id: String(product.id),
        name: String(product.name ?? ""),
        slug: String(product.slug ?? ""),
        ...(asDateString(product.updatedAt) ? { updatedAt: asDateString(product.updatedAt) } : {}),
      });

      return {
        archivedCount: (archived as CountResult).totalDocs,
        draftCount: (draft as CountResult).totalDocs,
        latestRmsSync: latestRmsRows[0] ? {
          completedAt: String(asDateString(latestRmsRows[0].completed_at) ?? ""),
          updatedCount: asNumber(latestRmsRows[0].updated_count),
        } : null,
        outOfStockCount: asNumber(outOfStockRows[0]?.out_of_stock_count),
        pendingPublicationProducts: pending.docs.map((product) => productSummary(product as unknown as Record<string, unknown>)),
        publishedCount: (published as CountResult).totalDocs,
        recentAuditEvents: recentAudits.docs.map((event) => ({
          action: String(event.action),
          ...(asDateString(event.createdAt) ? { createdAt: asDateString(event.createdAt) } : {}),
          subjectId: String(event.subjectId),
          subjectType: typeof event.subjectType === "string" ? event.subjectType : undefined,
        })),
        recentEdits: recentEdits.docs.map((product) => productSummary(product as unknown as Record<string, unknown>)),
        rmsFailureSummary: rmsFailureRows[0] ? {
          completedAt: String(asDateString(rmsFailureRows[0].completed_at) ?? ""),
          failedCount: asNumber(rmsFailureRows[0].failed_count),
        } : null,
        totalCount: (total as CountResult).totalDocs,
      };
    },
  };
}

export async function getAdminDashboardSnapshot(store?: AdminDashboardStore): Promise<AdminDashboardSnapshot> {
  if (store) return store.getSnapshot();
  const payload = await getPayload({ config: configPromise });
  return createPayloadAdminDashboardStore(payload).getSnapshot();
}
