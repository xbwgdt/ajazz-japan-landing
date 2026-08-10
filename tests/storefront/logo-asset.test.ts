import { access, readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("AJAZZ dark-surface logo", () => {
  it("preserves the source asset and provides transparent red and white artwork", async () => {
    await access(new URL("../../public/brand/ajazz-japan-logo.jpg", import.meta.url));
    const file = await readFile(new URL("../../public/brand/ajazz-japan-logo-dark.png", import.meta.url));
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, red = 0, white = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      const [r, g, b, a] = data.subarray(offset, offset + 4);
      if (a < 16) transparent += 1;
      if (a > 200 && r > 170 && g < 120 && b < 130) red += 1;
      if (a > 200 && r > 220 && g > 220 && b > 220) white += 1;
    }
    expect(transparent).toBeGreaterThan(1_000);
    expect(red).toBeGreaterThan(1_000);
    expect(white).toBeGreaterThan(1_000);
  });
});
