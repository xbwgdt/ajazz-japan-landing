import { cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function prepareStandaloneAssets(root = process.cwd()) {
  const standaloneRoot = join(root, ".next", "standalone");
  const publicTarget = join(standaloneRoot, "public");
  const staticTarget = join(standaloneRoot, ".next", "static");

  await Promise.all([
    rm(publicTarget, { force: true, recursive: true }),
    rm(staticTarget, { force: true, recursive: true }),
  ]);
  await Promise.all([
    cp(join(root, "public"), publicTarget, { recursive: true }),
    cp(join(root, ".next", "static"), staticTarget, { recursive: true }),
  ]);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await prepareStandaloneAssets();
}
