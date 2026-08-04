import configPromise from "@payload-config";
import { APIError, getPayload, type Payload } from "payload";
import type { Admin } from "../../payload-types";

type AuthenticatedAdmin = Admin & { collection?: string };

export async function authenticateAdmin(
  headers: Headers,
  payload?: Payload,
): Promise<Admin | null> {
  const client = payload ?? await getPayload({ config: configPromise });
  const { user } = await client.auth({ headers, canSetHeaders: false });
  if (!user) return null;

  const admin = user as AuthenticatedAdmin;
  if (admin.role !== "administrator") return null;
  if (admin.collection !== "admins") return null;
  return admin;
}

export async function requireAuthenticatedAdmin(
  headers: Headers,
  payload?: Payload,
): Promise<Admin> {
  const admin = await authenticateAdmin(headers, payload);
  if (!admin) throw new APIError("Unauthorized", 401);
  return admin;
}
