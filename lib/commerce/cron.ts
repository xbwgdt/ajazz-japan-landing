import { timingSafeEqual } from "node:crypto";

export function hasValidCronAuthorization(request: Request, secret: string | undefined) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !token) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
