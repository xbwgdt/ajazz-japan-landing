export interface StoreProductRecord {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  image: string;
  descriptionHtml: string;
  images: string[];
  variants: Array<{
    rmsSkuNumber: string;
    priceJpy: number;
    availableQuantity: number;
  }>;
}

export const storefrontProducts: StoreProductRecord[] = [
  {
    slug: "ak820-max-ultra",
    name: "AK820 MAX ULTRA",
    category: "RAPID TRIGGER",
    tagline: "75% Magnetic Switch Keyboard",
    image: "/images/ak820maxultra.webp",
    descriptionHtml: "磁気スイッチと高速入力のための75%レイアウト。",
    images: ["/images/ak820maxultra.webp"],
    variants: [{ rmsSkuNumber: "AK820-MAX-ULTRA", priceJpy: 19980, availableQuantity: 1 }],
  },
  {
    slug: "ak820-pro",
    name: "AK820 PRO",
    category: "MECHANICAL",
    tagline: "Tri-mode 75% Keyboard",
    image: "/images/ak820pro.webp",
    descriptionHtml: "ワークスペースにもゲーム環境にも対応するコンパクトメカニカル。",
    images: ["/images/ak820pro.webp"],
    variants: [{ rmsSkuNumber: "AK820-PRO", priceJpy: 12980, availableQuantity: 1 }],
  },
  {
    slug: "aj179-apex",
    name: "AJ179 APEX",
    category: "GAMING MOUSE",
    tagline: "8,000 Hz Triple-mode Mouse",
    image: "/images/aj179apex.webp",
    descriptionHtml: "8000Hzポーリングレートに対応した軽量ワイヤレスマウス。",
    images: ["/images/aj179apex.webp"],
    variants: [{ rmsSkuNumber: "AJ179-APEX", priceJpy: 8980, availableQuantity: 1 }],
  },
  {
    slug: "akp05-pro",
    name: "AKP05 PRO",
    category: "STREAM CONTROL",
    tagline: "Programmable Control Pad",
    image: "/images/akp05pro.webp",
    descriptionHtml: "配信とクリエイティブワークのためのプログラマブルコントロール。",
    images: ["/images/akp05pro.webp"],
    variants: [{ rmsSkuNumber: "AKP05-PRO", priceJpy: 7980, availableQuantity: 1 }],
  },
];

export function getStorefrontProduct(slug: string) {
  return storefrontProducts.find((product) => product.slug === slug);
}
