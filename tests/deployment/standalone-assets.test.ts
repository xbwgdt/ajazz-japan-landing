import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("standalone deployment assets", () => {
  it("prepares standalone assets after every production build", async () => {
    const packageJson = JSON.parse(
      await readFile(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: { build: string } };

    expect(packageJson.scripts.build).toBe(
      "next build && node scripts/prepare-standalone-assets.mjs",
    );
  });

  it("copies public and Next.js static assets into the standalone server", async () => {
    const root = await mkdtemp(join(tmpdir(), "ajazz-standalone-"));
    temporaryDirectories.push(root);
    await mkdir(join(root, "public", "brand"), { recursive: true });
    await mkdir(join(root, ".next", "static", "chunks"), { recursive: true });
    await mkdir(join(root, ".next", "standalone"), { recursive: true });
    await writeFile(join(root, "public", "brand", "logo.jpg"), "logo");
    await writeFile(join(root, ".next", "static", "chunks", "app.css"), "css");

    const scriptUrl = pathToFileURL(
      join(process.cwd(), "scripts", "prepare-standalone-assets.mjs"),
    ).href;
    const { prepareStandaloneAssets } = await import(scriptUrl);
    await prepareStandaloneAssets(root);

    await expect(
      readFile(join(root, ".next", "standalone", "public", "brand", "logo.jpg"), "utf8"),
    ).resolves.toBe("logo");
    await expect(
      readFile(
        join(root, ".next", "standalone", ".next", "static", "chunks", "app.css"),
        "utf8",
      ),
    ).resolves.toBe("css");
  });
});
