import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import { importRmsWorkbook, readRmsWorkbook } from "../../scripts/import-rms-catalog";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("RMS workbook reader", () => {
  it("reads parent product rows and their SKU rows", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ajazz-rms-"));
    temporaryDirectories.push(directory);
    const filePath = join(directory, "catalog.xlsx");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("items");

    worksheet.addRow([
      "商品管理番号（商品URL）",
      "商品名",
      "PC用商品説明文",
      "商品画像パス1",
      "SKU管理番号",
      "通常販売価格",
      "在庫数",
    ]);
    worksheet.addRow([
      "ak820-max",
      "AK820 MAX",
      "<p>Rapid trigger keyboard</p>",
      "/12437413/ak820/hero.jpg",
    ]);
    worksheet.addRow(["ak820-max", undefined, undefined, undefined, "AK820-BLACK", 19980, 4]);
    await workbook.xlsx.writeFile(filePath);

    await expect(readRmsWorkbook(filePath)).resolves.toEqual([
      {
        rmsManageNumber: "ak820-max",
        name: "AK820 MAX",
        descriptionHtml: "<p>Rapid trigger keyboard</p>",
        imagePaths: ["/12437413/ak820/hero.jpg"],
      },
      {
        rmsManageNumber: "ak820-max",
        rmsSkuNumber: "AK820-BLACK",
        salePriceJpy: 19980,
        stockQuantity: 4,
        imagePaths: [],
      },
    ]);

    const importedRows: unknown[] = [];
    await importRmsWorkbook(filePath, async (rows) => {
      importedRows.push(...rows);
      return 1;
    });

    expect(importedRows).toHaveLength(2);
  });
});
