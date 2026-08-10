import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import {
  parseRmsWorksheetRows,
  upsertRmsCatalog,
  type RmsCatalogRow,
} from "../lib/commerce/catalog";

export async function readRmsWorkbook(filePath: string): Promise<RmsCatalogRow[]> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = extname(filePath).toLowerCase() === ".csv"
    ? await workbook.csv.read(
      Readable.from([new TextDecoder("shift_jis").decode(await readFile(filePath))]),
      { sheetName: "items" },
    )
    : await workbook.xlsx.readFile(filePath).then(() => workbook.worksheets[0]);
  if (!worksheet) {
    throw new Error("The RMS workbook does not contain a worksheet");
  }

  const headers = new Map<number, string>();
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const value = cell.text.trim();
    if (value) {
      headers.set(columnNumber, value);
    }
  });

  const rows: Array<Record<string, unknown>> = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const values: Record<string, unknown> = {};
    for (const [columnNumber, header] of headers) {
      values[header] = row.getCell(columnNumber).value;
    }
    rows.push(values);
  });

  return parseRmsWorksheetRows(rows);
}

export async function importRmsWorkbook(
  filePath: string,
  importer: (rows: RmsCatalogRow[]) => Promise<number> = upsertRmsCatalog,
) {
  return importer(await readRmsWorkbook(filePath));
}

export async function importRmsWorkbookWithCms(filePath: string) {
  const rows = await readRmsWorkbook(filePath);
  const [{ getPayload }, { default: config }, { upsertRmsEditorialDraft }] = await Promise.all([
    import("payload"),
    import("@payload-config"),
    import("../lib/cms/rms-drafts"),
  ]);
  const payload = await getPayload({ config });
  return upsertRmsCatalog(rows, {
    async resolveCmsProductId(product) {
      const found = await payload.find({
        collection: "products",
        depth: 0,
        draft: true,
        limit: 2,
        overrideAccess: true,
        where: { rmsManageNumber: { equals: product.rmsManageNumber } },
      });
      if (found.docs.length > 1) {
        throw new Error(`Ambiguous RMS CMS linkage for ${product.rmsManageNumber}`);
      }
      const existing = found.docs[0];
      if (!existing) return undefined;
      if (existing.sourceType !== "rms") {
        throw new Error(`RMS source conflicts with a manual CMS product: ${product.rmsManageNumber}`);
      }
      return existing.id;
    },
    afterOperationalImport(product) {
      return upsertRmsEditorialDraft(product, payload);
    },
  });
}
