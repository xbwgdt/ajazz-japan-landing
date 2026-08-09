import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Payload admin layout", () => {
  it("wraps Payload server functions in a local Next.js server action", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "app/(payload)/layout.tsx"),
      "utf8",
    );

    expect(layout).toMatch(/const serverFunction: ServerFunctionClient = async function/);
    expect(layout).toMatch(/async function \(args\) \{\s*["']use server["'];/);
    expect(layout).toMatch(
      /handleServerFunctions\(\{\s*\.\.\.args,\s*config: configPromise,\s*importMap,\s*\}\)/,
    );
    expect(layout).toContain("serverFunction={serverFunction}");
  });
});
