import { createHmac } from "node:crypto";
import { commerceSql, ensureCommerceSchema } from "./commerce/db";

const MAX_FAILURES = 5;

export interface AdminLoginAttemptStore {
  assessAttempt(clientKey: string, passwordMatches: boolean): Promise<"accepted" | "invalid" | "blocked">;
}

export async function assessAdminLogin(
  clientKey: string,
  passwordMatches: boolean,
  store: AdminLoginAttemptStore,
) {
  return { status: await store.assessAttempt(clientKey, passwordMatches) } as const;
}

export function adminLoginAddress(request: Request) {
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function adminLoginScopeKey(secret: string, railwayClientAddress: string) {
  return createHmac("sha256", secret).update(railwayClientAddress).digest("hex");
}

export function adminLoginClientKey(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SECRET is not configured");
  return adminLoginScopeKey(secret, adminLoginAddress(request));
}

export function databaseAdminLoginAttemptStore(): AdminLoginAttemptStore {
  return {
    async assessAttempt(clientKey, passwordMatches) {
      await ensureCommerceSchema();
      return commerceSql().begin(async (sql) => {
        await sql`SELECT pg_advisory_xact_lock(hashtext(${clientKey}))`;
        await sql`DELETE FROM admin_login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'`;
        const [row] = await sql<Array<{ failures: number }>>`
          SELECT COUNT(*)::int AS failures
          FROM admin_login_attempts
          WHERE client_key = ${clientKey}
            AND attempted_at >= NOW() - INTERVAL '15 minutes'
        `;
        if (Number(row?.failures ?? 0) >= MAX_FAILURES) return "blocked" as const;
        if (passwordMatches) {
          await sql`DELETE FROM admin_login_attempts WHERE client_key = ${clientKey}`;
          return "accepted" as const;
        }
        await sql`INSERT INTO admin_login_attempts (client_key) VALUES (${clientKey})`;
        return "invalid" as const;
      });
    },
  };
}
