import { importRmsWorkbook } from "./import-rms-catalog";

export function resolveRmsWorkbookPath(arguments_: string[]) {
  if (arguments_.length !== 1 || !arguments_[0]?.trim()) {
    throw new Error("Usage: pnpm import:rms <path-to-rms-xlsx>");
  }
  return arguments_[0];
}

async function main() {
  const filePath = resolveRmsWorkbookPath(process.argv.slice(2));
  const count = await importRmsWorkbook(filePath);
  console.log(`Imported ${count} RMS products.`);
}

if (process.argv[1]?.endsWith("import-rms-catalog-cli.ts")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
