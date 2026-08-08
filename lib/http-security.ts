export function isSameOrigin(request: Pick<Request, "headers" | "url">) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return Boolean(host && origin === `${protocol}://${host}`);
}
