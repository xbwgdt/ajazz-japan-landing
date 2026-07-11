import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "survey_admin";
export const PARTICIPANT_COOKIE = "survey_participant";
export const COMPLETED_COOKIE = "survey_completed";

export function hashIdentifier(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeNameKey(name: string) {
  return hashIdentifier(name.normalize("NFKC").toLocaleLowerCase("ja-JP"));
}

function getAdminSecret() {
  const secret = process.env.SURVEY_ADMIN_SECRET;
  if (secret && secret.length >= 32) return secret;

  const password = process.env.SURVEY_ADMIN_PASSWORD;
  if (password) return password;

  throw new Error("SURVEY_ADMIN_SECRET is not configured");
}

export function verifyAdminPassword(value: string) {
  const expected = process.env.SURVEY_ADMIN_PASSWORD;
  if (!expected) throw new Error("SURVEY_ADMIN_PASSWORD is not configured");
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAdminToken() {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = String(expiresAt);
  const signature = createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token?: string) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || Number(payload) < Date.now()) return false;
  try {
    const expected = createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
    return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return Boolean(host && origin === `${protocol}://${host}`);
}
