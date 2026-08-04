import { describe, expect, it } from "vitest";
import configPromise from "../../payload.config";

describe("Payload configuration", () => {
  it("isolates CMS tables and exposes only temporary CMS routes", async () => {
    const config = await configPromise;
    expect(config.routes.admin).toBe("/cms");
    expect(config.routes.api).toBe("/api/cms");
    expect(config.collections?.map((item) => item.slug)).toContain("admins");
  });
});
