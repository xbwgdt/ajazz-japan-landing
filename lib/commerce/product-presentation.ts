import type { ProductSpecifications } from "./product-specifications";

// Exact imported identities, not a slug parser: several legacy slugs contain typos.
const catalogNames: Record<string, readonly [string, string]> = {
  "308i": ["308I", "メンブレンキーボード"],
  af18: ["AF18", "ワイヤレステンキー"],
  af68: ["AF68", "ゲーミングキーボード"],
  af84: ["AF84", "メンブレンキーボード"],
  ahm08max: ["AHM08 MAX", "ゲーミングヘッドセット"],
  aj39pv3max: ["AJ139P V3 MAX", "ゲーミングマウス"],
  aj139v2mc: ["AJ139 V2 MC", "ゲーミングマウス"],
  "aj139v2mc-black": ["AJ139 V2 MC", "ゲーミングマウス・ブラック"],
  aj159apex: ["AJ159 APEX", "ゲーミングマウス"],
  "aj159p-mc-pro": ["AJ159P MC PRO", "ゲーミングマウス"],
  aj159pmc: ["AJ159P MC", "ゲーミングマウス"],
  aj159v2mc: ["AJ159 V2 MC", "ゲーミングマウス"],
  aj179apex: ["AJ179 APEX", "ゲーミングマウス"],
  aj199: ["AJ199", "ゲーミングマウス"],
  aj199max: ["AJ199 MAX", "ゲーミングマウス"],
  aj39pv3mc: ["AJ139P V3 MC", "ゲーミングマウス"],
  ak029: ["AK029", "片手用ラピッドトリガーキーボード"],
  ak6820v2: ["AK680 V2", "ラピッドトリガーキーボード"],
  "ak820-3": ["AK820", "メカニカルキーボード"],
  // These are separate records with the same source title; do not merge their SKUs.
  ak820max: ["AK820 MAX PLUS", "メカニカルキーボード"],
  ak820maxplus: ["AK820 MAX PLUS", "メカニカルキーボード"],
  ak820maxultra: ["AK820 MAX ULTRA", "ラピッドトリガーキーボード"],
  ak820pro: ["AK820 Pro", "メカニカルキーボード"],
  ak820v2: ["AK820 V2", "メカニカルキーボード"],
  ak820v2pro: ["AK820 V2 Pro", "メカニカルキーボード"],
  ak870v2: ["AK870 V2", "メカニカルキーボード・三モードモデル"],
  "ak870v2-black": ["AK870 V2", "メカニカルキーボード・有線モデル"],
  ak980max: ["AK980 MAX", "ラピッドトリガーキーボード"],
  ak980v2: ["AK980 V2", "メカニカルキーボード"],
  akp03e: ["AKP03E", "ストリームコントローラー"],
  akp03j: ["AKP03J", "ストリームコントローラー"],
  akp05j: ["AKP05J", "ストリームコントローラー"],
  akp05pro: ["AKP05 Pro", "ストリームコントローラー"],
  akp153: ["AKP153", "ストリームコントローラー"],
  akp153j: ["AKP153J", "ストリームコントローラー"],
  i300: ["i300", "エルゴノミクスマウス"],
  mk87: ["MK87", "メカニカルキーボード"],
  mk87pro: ["MK87 Pro", "メカニカルキーボード"],
  mousepad: ["ゲーミングマウスパッド", "大型デスクマット"],
  n1: ["N1", "ストリームコントローラー"],
};

// Display copy only: original RMS identifiers, commerce values and CMS content remain unchanged.
export function productPresentation(name: string, slug?: string) {
  const isAk820V2Rt = slug === "ak820v2-rt" || (!slug && /AK820\s*V2\b/i.test(name) && /ラピッドトリガー/.test(name));
  if (!isAk820V2Rt) {
    const identity = slug ? catalogNames[slug] : undefined;
    return { title: identity?.[0] ?? name, subtitle: identity?.[1] ?? "", lead: "", highlights: [] as string[], specifications: {} as ProductSpecifications };
  }
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
