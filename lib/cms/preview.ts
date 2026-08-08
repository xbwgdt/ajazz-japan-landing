import { createHmac, timingSafeEqual } from "node:crypto";
import type { Admin } from "../../payload-types";
import type { Payload, PayloadRequest } from "payload";

const PREVIEW_VERSION = 1;
const MAX_PREVIEW_SECONDS = 10 * 60;
const PRODUCT_ID_PATTERN = /^[1-9]\d*$/;

export interface PreviewClaims {
  version: 1;
  productId: string;
  revision: number;
  issuedAt: number;
  expiresAt: number;
}

interface PreviewTokenOptions {
  now?: number;
  secret?: string;
}

interface PreviewAuthorizationDependencies {
  authenticate: (headers: Headers, payload: Payload) => Promise<Admin | null>;
  createRequest: (options: Record<string, unknown>, payload: Payload) => Promise<PayloadRequest>;
  enable: () => Promise<void> | void;
  getPayload: () => Promise<Payload>;
  now?: number;
}

export type PreviewAuthorizationResult =
  | { path: string; status: 200 }
  | { code: string; status: 400 | 401 | 404 | 409 };

function unixNow(): number {
  return Math.floor(Date.now() / 1_000);
}

function previewSecret(explicit?: string): string {
  const secret = explicit ?? process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET is required for product preview tokens");
  return secret;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validClaims(value: unknown): value is PreviewClaims {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== "expiresAt,issuedAt,productId,revision,version") return false;
  return value.version === PREVIEW_VERSION
    && typeof value.productId === "string"
    && PRODUCT_ID_PATTERN.test(value.productId)
    && Number.isSafeInteger(value.revision)
    && Number(value.revision) >= 0
    && Number.isSafeInteger(value.issuedAt)
    && Number.isSafeInteger(value.expiresAt)
    && Number(value.expiresAt) > Number(value.issuedAt)
    && Number(value.expiresAt) - Number(value.issuedAt) <= MAX_PREVIEW_SECONDS;
}

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createPreviewToken(
  input: { productId: string | number; revision: number; expiresAt: number },
  options: PreviewTokenOptions = {},
): string {
  const issuedAt = options.now ?? unixNow();
  const claims: PreviewClaims = {
    version: PREVIEW_VERSION,
    productId: String(input.productId),
    revision: input.revision,
    issuedAt,
    expiresAt: input.expiresAt,
  };
  if (claims.expiresAt > issuedAt + MAX_PREVIEW_SECONDS) {
    throw new Error("Product preview tokens cannot remain valid longer than ten minutes");
  }
  if (!validClaims(claims)) throw new Error("Invalid product preview claims");
  const encoded = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded, previewSecret(options.secret)).toString("base64url")}`;
}

export function verifyPreviewToken(
  token: string,
  options: PreviewTokenOptions = {},
): PreviewClaims | null {
  try {
    const secret = previewSecret(options.secret);
    if (typeof token !== "string" || token.length > 2_048) return null;
    const parts = token.split(".");
    if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const [encoded, encodedSignature] = parts;
    const expected = signature(encoded, secret);
    const supplied = Buffer.from(encodedSignature, "base64url");
    const comparable = Buffer.alloc(expected.length);
    supplied.copy(comparable, 0, 0, expected.length);
    const signaturesMatch = timingSafeEqual(expected, comparable) && supplied.length === expected.length;
    if (!signaturesMatch) return null;

    const claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    if (!validClaims(claims)) return null;
    const now = options.now ?? unixNow();
    if (claims.issuedAt > now || claims.expiresAt <= now) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function authorizeProductPreview(
  request: Request,
  dependencies: PreviewAuthorizationDependencies,
): Promise<PreviewAuthorizationResult> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const slug = url.searchParams.get("slug");
  if (!token || !slug || slug.length > 200) return { code: "invalid_preview_request", status: 400 };

  const claims = verifyPreviewToken(token, { now: dependencies.now });
  if (!claims) return { code: "invalid_preview_token", status: 401 };

  const payload = await dependencies.getPayload();
  const admin = await dependencies.authenticate(request.headers, payload);
  if (!admin) return { code: "unauthorized", status: 401 };

  const req = await dependencies.createRequest({
    req: { headers: request.headers },
    user: admin,
  }, payload) as PayloadRequest;
  const result = await payload.find({
    collection: "products",
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: false,
    req,
    where: { slug: { equals: slug } },
  });
  const product = result.docs[0];
  if (!product) return { code: "preview_product_not_found", status: 404 };
  if (String(product.id) !== claims.productId || Number(product.editorialRevision) !== claims.revision) {
    return { code: "preview_stale", status: 409 };
  }

  await dependencies.enable();
  return { path: `/products/${encodeURIComponent(String(product.slug))}`, status: 200 };
}
