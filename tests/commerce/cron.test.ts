import { describe, expect, it } from "vitest";
import { hasValidCronAuthorization } from "../../lib/commerce/cron";

describe("commerce cron authorization", () => {
  it("accepts only the configured bearer secret", () => {
    expect(hasValidCronAuthorization(new Request("https://ajazz.jp", { headers: { authorization: "Bearer cron-secret" } }), "cron-secret")).toBe(true);
    expect(hasValidCronAuthorization(new Request("https://ajazz.jp"), "cron-secret")).toBe(false);
    expect(hasValidCronAuthorization(new Request("https://ajazz.jp", { headers: { authorization: "Bearer wrong" } }), "cron-secret")).toBe(false);
  });
});
