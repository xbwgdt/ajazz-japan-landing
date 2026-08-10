import { importRmsWorkbookWithCms, readRmsWorkbook } from "./import-rms-catalog";
import { buildRmsCatalogImport } from "../lib/commerce/catalog";

export function resolveRmsImportArguments(arguments_: string[]) {
  const dryRun = arguments_[0] === "--dry-run";
  const paths = dryRun ? arguments_.slice(1) : arguments_;
  if (paths.length !== 1 || !paths[0]?.trim()) {
    throw new Error("Usage: pnpm import:rms [--dry-run] <path-to-rms-xlsx>");
  }
  return { filePath: paths[0], dryRun };
}

export async function runCliAndExit(
  operation: () => Promise<void>,
  exit: (code: number) => void,
  reportError: (error: unknown) => void = console.error,
): Promise<void> {
  try {
    await operation();
    exit(0);
  } catch (error) {
    reportError(error instanceof Error ? error.message : error);
    exit(1);
  }
}

async function main() {
  const { filePath, dryRun } = resolveRmsImportArguments(process.argv.slice(2));
  if (dryRun) {
    const rows = await readRmsWorkbook(filePath);
    const products = buildRmsCatalogImport(rows);
    console.log(JSON.stringify({
      rows: rows.length,
      products: products.length,
      variants: products.reduce((total, product) => total + product.variants.length, 0),
      productsWithImages: products.filter((product) => product.images.length > 0).length,
    }, null, 2));
    return;
  }
  const count = await importRmsWorkbookWithCms(filePath);
  console.log(`Imported ${count} RMS products.`);
}

if (process.argv[1]?.endsWith("import-rms-catalog-cli.ts")) {
  void runCliAndExit(main, (code) => process.exit(code));
}
