import ExcelJS from "exceljs";
import {
  parseRmsWorksheetRows,
  upsertRmsCatalog,
  type RmsCatalogRow,
} from "../lib/commerce/catalog";

export async function readRmsWorkbook(filePath: string): Promise<RmsCatalogRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
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
    afterOperationalImport(product) {
      return upsertRmsEditorialDraft(product, payload);
    },
  });
}
