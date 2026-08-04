import { describe, expect, it } from "vitest";
import { isSameOrigin } from "../../lib/http-security";

describe("order mutation origin security", () => {
  it("accepts a same-origin request behind the Railway proxy", () => {
    const request = new Request("http://127.0.0.1/api/admin/orders/order-1", {
      headers: {
        origin: "https://ajazz.jp",
        "x-forwarded-host": "ajazz.jp",
        "x-forwarded-proto": "https",
      },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it("rejects a cross-origin request", () => {
    const request = new Request("https://ajazz.jp/api/admin/orders/order-1", {
      headers: {
        host: "ajazz.jp",
        origin: "https://attacker.example",
      },
    });

    expect(isSameOrigin(request)).toBe(false);
  });
});
