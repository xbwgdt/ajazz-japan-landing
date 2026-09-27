import type { ProductSpecifications } from "./product-specifications";

// Display copy only: original RMS identifiers, commerce values and CMS content remain unchanged.
export function productPresentation(name: string, slug?: string) {
  const isAk820V2Rt = slug === "ak820v2-rt" || (!slug && /AK820\s*V2\b/i.test(name) && /ラピッドトリガー/.test(name));
  if (!isAk820V2Rt) return { title: name, subtitle: "", lead: "", highlights: [] as string[], specifications: {} as ProductSpecifications };
  // Conservative copy from the supplied AK820V2 RMS title; no latency or precision claims.
  return {
    title: "AK820 V2 RT",
    subtitle: "ラピッドトリガーキーボード",
    lead: "75%レイアウトに、磁気スイッチと音量調整ノブを搭載。ゲームにも、毎日のデスクワークにも。",
    highlights: ["75%レイアウト", "磁気スイッチ", "USB-C 有線接続", "RGBバックライト"],
    specifications: {
      keyboardLayout: "75%",
      switchType: "磁気スイッチ",
      connectionModes: ["wired"],
      rapidTriggerSupported: true,
      supportedOperatingSystems: ["windows", "macos"],
    } as ProductSpecifications,
  };
}
