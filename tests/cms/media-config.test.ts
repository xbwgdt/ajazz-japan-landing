import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Media } from "../../cms/collections/Media";

describe("Media collection", () => {
  it("is an upload collection with direct deletion disabled", () => {
    expect(Media.slug).toBe("media");
    expect(Media.upload).toMatchObject({
      hideRemoveFile: true,
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    expect(Media.access?.delete?.({ req: { user: { id: 1 } } } as never)).toBe(false);
  });

  it("makes retired media inaccessible to every reader immediately", () => {
    expect(Media.access?.read?.({ req: { user: null } } as never)).toEqual({
      retiredAt: { exists: false },
    });
    expect(Media.access?.read?.({ req: { user: { id: 1 } } } as never)).toEqual({
      retiredAt: { exists: false },
    });
  });

  it("rejects file replacement while allowing metadata-only updates", async () => {
    const hook = Media.hooks?.beforeOperation?.[0];
    const req = {
      context: {},
      file: {
        data: Buffer.from("replacement"),
        mimetype: "image/jpeg",
        name: "replacement.jpg",
        size: 11,
      },
      user: { id: 1 },
    };

    await expect(hook?.({
      args: {},
      collection: Media,
      context: {},
      operation: "update",
      overrideAccess: true,
      req,
    } as never)).rejects.toMatchObject({ status: 400 });

    await expect(hook?.({
      args: { data: { alt: "Updated alt" } },
      collection: Media,
      context: {},
      operation: "update",
      overrideAccess: true,
      req: { ...req, file: undefined },
    } as never)).resolves.toEqual({ data: { alt: "Updated alt" } });
  });

  it("owns the required products prefix on the server", () => {
    const prefix = Media.fields.find((field) => "name" in field && field.name === "prefix");
    expect(prefix).toMatchObject({
      access: expect.objectContaining({ create: expect.any(Function), update: expect.any(Function) }),
      defaultValue: "products",
      name: "prefix",
      required: true,
      type: "text",
    });
  });

  it("keeps the generated filename immutable after upload", () => {
    const filename = Media.fields.find((field) => "name" in field && field.name === "filename");
    expect(filename).toMatchObject({
      access: expect.objectContaining({ update: expect.any(Function) }),
      admin: expect.objectContaining({ readOnly: true }),
      name: "filename",
      required: true,
    });
    expect((filename as { access: { update: () => boolean } }).access.update()).toBe(false);
  });

  it("does not decode an unauthenticated upload before collection access runs", async () => {
    const hook = Media.hooks?.beforeOperation?.[0];
    await expect(hook?.({
      args: {},
      collection: Media,
      context: {},
      operation: "create",
      overrideAccess: false,
      req: {
        context: {},
        file: {
          data: Buffer.from("not an image"),
          mimetype: "image/jpeg",
          name: "spoof.jpg",
          size: 12,
        },
        user: null,
      },
    } as never)).resolves.toEqual({});
  });

  it("keeps the generated media lifecycle migration inside the CMS schema", () => {
    const migration = readFileSync(resolve(
      process.cwd(),
      "cms/migrations/20260808_154913.ts",
    ), "utf8");

    expect(migration).not.toMatch(/"public"/i);
    expect(migration).not.toMatch(
      /\b(?:(?:ALTER|CREATE|DROP) TABLE|(?:CREATE|DROP) TYPE|REFERENCES)\s+"(?!cms")/i,
    );
    const createdIndexes = migration.match(/CREATE INDEX\s+"[^"]+"\s+ON\s+"cms"\."[^"]+"/gi) ?? [];
    const droppedIndexes = migration.match(/DROP INDEX\s+"cms"\."[^"]+"/gi) ?? [];
    expect(createdIndexes).toHaveLength(5);
    expect(droppedIndexes).toHaveLength(5);
    expect(migration).toContain('UPDATE "cms"."media"');
    expect(migration).toContain('ALTER COLUMN "purpose" SET NOT NULL');
    expect(migration).toContain('ALTER COLUMN "content_hash" SET NOT NULL');
    expect(migration).toContain('ADD COLUMN "prefix" varchar DEFAULT \'products\' NOT NULL');
    expect(migration).not.toContain('ALTER COLUMN "filename" DROP NOT NULL');
    expect(migration).not.toContain('ALTER COLUMN "filename" SET NOT NULL');
  });
});
