import type { ProductCategoryKey } from "../commerce/product-categories";

export const DRIVER_DESTINATION = "https://www.a-jazz.com/en/h-col-160.html";
export const DRIVER_LINK_PROPS = {
  href: DRIVER_DESTINATION,
  rel: "noopener noreferrer",
  target: "_blank",
} as const;

const ALLOWED_NAVIGATION_ROUTES = new Set(["/", "/about", "/legal", "/privacy", "/terms"]);
const CATEGORY_KEYS = new Set<ProductCategoryKey>([
  "rapid-trigger-keyboard",
  "mechanical-keyboard",
  "membrane-keyboard",
  "mouse",
  "stream-controller",
  "headset",
  "other",
]);

type NavigationLink = { label: string; href: string };
type SocialLink = { label: string; href: string };
type CompanySection = { eyebrow: string; title: string; paragraphs: string[] };

export interface SiteSettingsViewModel {
  homepage: {
    eyebrow: string;
    title: string;
    copy: string;
    primaryCommandLabel: string;
    secondaryCommandLabel: string;
    heroMediaUrl: string;
    featuredCategoryOrder: ProductCategoryKey[];
    featuredProductSlugs: string[];
  };
  company: {
    brand: CompanySection;
    support: CompanySection;
    business: CompanySection & { commandLabel: string };
  };
  contact: { email: string; phone: string };
  footer: { companyName: string; address: string; navigation: NavigationLink[] };
  socialLinks: SocialLink[];
  legal: {
    sellerName: string;
    responsiblePerson: string;
    address: string;
    phone: string;
    email: string;
    priceNotice: string;
    additionalFees: string;
    payment: string;
    delivery: string;
    deliveryArea: string;
    returns: string;
    refunds: string;
    quantity: string;
  };
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsViewModel = {
  homepage: {
    eyebrow: "AJAZZ PERFORMANCE EDITION",
    title: "INPUT AT\nTHE SPEED OF INTENT.",
    copy: "ラピッドトリガーから高性能ワイヤレスまで。勝負を分ける一打のために設計されたAJAZZの入力デバイス。",
    primaryCommandLabel: "製品を見る",
    secondaryCommandLabel: "ドライバーを探す",
    heroMediaUrl: "/images/ajazz-gaming-desk-hero.webp",
    featuredCategoryOrder: [
      "rapid-trigger-keyboard",
      "mechanical-keyboard",
      "membrane-keyboard",
      "mouse",
      "stream-controller",
      "headset",
      "other",
    ],
    featuredProductSlugs: [],
  },
  company: {
    brand: {
      eyebrow: "BRAND",
      title: "AJAZZ、2009年に誕生した\nPC周辺機器ブランド",
      paragraphs: [
        "AJAZZは、長年にわたる製品開発の経験を活かし、エントリーモデルから、ラピッドトリガー対応キーボード、高ポーリングレート対応マウス、デザイン性に優れたデスクセットアップ向けモデルまで、用途やプレイスタイルに合わせて選べる、豊富な製品ラインナップを展開しています。",
        "性能・使いやすさ・デザインのバランスを大切にしながら、毎日のPC体験をより快適で楽しいものにしていきます。",
      ],
    },
    support: {
      eyebrow: "JAPAN SUPPORT",
      title: "AJAZZ日本法人による\n安心サポート",
      paragraphs: [
        "日本法人であるアジャズジャパン株式会社（AJAZZ JAPAN）が国内窓口として対応します。海外発送を中心とするブランドとは異なり、日本人スタッフがご購入後のお問い合わせや保証相談まで丁寧にサポートします。",
        "安心して製品を選び、長く快適にお使いいただけるよう、初期設定や使い方の不安にも寄り添い、日本品質のサポートを提供します。",
      ],
    },
    business: {
      eyebrow: "BUSINESS CAPABILITY",
      title: "日本市場と世界のものづくりをつなぐ、\nAJAZZの開発・供給力。",
      paragraphs: [
        "アジャズジャパン株式会社は、AJAZZブランド製品の日本国内販売に加え、ゲーミングデバイス分野で培った製品開発力とグローバルな生産ネットワークを活かし、OEM製品の企画・開発および法人・販売店向けの卸売にも対応しています。",
        "製品仕様、デザイン、パッケージ、日本市場向けの展開まで、事業内容に合わせたご相談を承ります。OEM・卸売をご検討の企業様は、メールでお問い合わせください。",
      ],
      commandLabel: "法人・事業相談をメールする",
    },
  },
  contact: { email: "xiet@a-jazz.com", phone: "070-9319-5121" },
  footer: {
    companyName: "アジャズジャパン株式会社",
    address: "〒340-0043 埼玉県草加市草加2-13-21-7",
    navigation: [
      { label: "会社情報", href: "/about" },
      { label: "特定商取引法に基づく表記", href: "/legal" },
      { label: "プライバシーポリシー", href: "/privacy" },
      { label: "利用規約", href: "/terms" },
    ],
  },
  socialLinks: [],
  legal: {
    sellerName: "アジャズジャパン株式会社",
    responsiblePerson: "代表取締役社長 謝天",
    address: "〒340-0043 埼玉県草加市草加2-13-21-7",
    phone: "070-9319-5121",
    email: "xiet@a-jazz.com",
    priceNotice: "各商品ページに表示する価格（税込）",
    additionalFees: "日本国内への送料は無料です。インターネット接続にかかる通信費等はお客様のご負担です。",
    payment: "クレジットカード決済（Stripe）。ご注文時に決済されます。",
    delivery: "ご注文確認後、通常3営業日以内に発送します。天候・配送事情・在庫状況等により遅れる場合があります。",
    deliveryArea: "日本国内",
    returns: "商品到着後7日以内にご連絡ください。お客様都合の返品・交換にかかる返送料はご負担いただきます。初期不良と確認できた場合の返送料は当社が負担します。使用済み商品、付属品・外装の欠損がある商品等はお受けできない場合があります。",
    refunds: "返品商品を確認後、返金対象額を元のお支払い方法へ返金します。返金時期はカード会社の処理により異なります。",
    quantity: "各商品ページに表示する在庫数の範囲内です。",
  },
};

type RecordValue = Record<string, unknown>;

export function containsHtmlMarkup(value: string): boolean {
  return /<[^>]+>/.test(value);
}

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function cleanText(value: unknown, fallback: string, max = 1_000): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized && normalized.length <= max && !containsHtmlMarkup(normalized)
    ? normalized
    : fallback;
}

function cleanEmail(value: unknown, fallback: string): string {
  const email = cleanText(value, "", 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : fallback;
}

function cleanParagraphs(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const paragraphs = value
    .map((item) => cleanText(record(item).text ?? item, "", 2_000))
    .filter(Boolean)
    .slice(0, 4);
  return paragraphs.length > 0 ? paragraphs : fallback;
}

function cleanMediaUrl(value: unknown, fallback: string): string {
  const relation = record(value);
  const candidate = typeof value === "string" ? value : relation.url;
  if (typeof candidate !== "string") return fallback;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCompanySection(value: unknown, fallback: CompanySection): CompanySection {
  const section = record(value);
  return {
    eyebrow: cleanText(section.eyebrow, fallback.eyebrow, 80),
    title: cleanText(section.title, fallback.title, 180),
    paragraphs: cleanParagraphs(section.paragraphs, fallback.paragraphs),
  };
}

export function normalizeSiteSettings(input: unknown): SiteSettingsViewModel {
  const source = record(input);
  const homepage = record(source.homepage);
  const company = record(source.company);
  const contact = record(source.contact);
  const footer = record(source.footer);
  const legal = record(source.legal);
  const categoryOrder = Array.isArray(homepage.featuredCategoryOrder)
    ? homepage.featuredCategoryOrder
      .map((item) => cleanText(record(item).category ?? item, "", 64))
      .filter((item): item is ProductCategoryKey => CATEGORY_KEYS.has(item as ProductCategoryKey))
    : [];
  const productSlugs = Array.isArray(homepage.featuredProducts)
    ? homepage.featuredProducts
      .map((item) => cleanText(record(item).slug ?? item, "", 160))
      .filter((slug) => /^[a-z0-9][a-z0-9-]*$/.test(slug))
      .slice(0, 24)
    : [];
  const navigation = Array.isArray(footer.navigation)
    ? footer.navigation.flatMap((item) => {
      const link = record(item);
      const href = cleanText(link.href, "", 80);
      const label = cleanText(link.label, "", 80);
      return label && ALLOWED_NAVIGATION_ROUTES.has(href) ? [{ label, href }] : [];
    }).slice(0, 8)
    : DEFAULT_SITE_SETTINGS.footer.navigation;
  const socialLinks = Array.isArray(source.socialLinks)
    ? source.socialLinks.flatMap((item) => {
      const link = record(item);
      const label = cleanText(link.label, "", 80);
      const href = cleanText(link.href, "", 500);
      try {
        const protocol = new URL(href).protocol;
        return label && (protocol === "https:" || protocol === "mailto:") ? [{ label, href }] : [];
      } catch {
        return [];
      }
    }).slice(0, 8)
    : [];

  const business = normalizeCompanySection(company.business, DEFAULT_SITE_SETTINGS.company.business);
  return {
    homepage: {
      eyebrow: cleanText(homepage.eyebrow, DEFAULT_SITE_SETTINGS.homepage.eyebrow, 100),
      title: cleanText(homepage.title, DEFAULT_SITE_SETTINGS.homepage.title, 180),
      copy: cleanText(homepage.copy, DEFAULT_SITE_SETTINGS.homepage.copy, 600),
      primaryCommandLabel: cleanText(homepage.primaryCommandLabel, DEFAULT_SITE_SETTINGS.homepage.primaryCommandLabel, 80),
      secondaryCommandLabel: cleanText(homepage.secondaryCommandLabel, DEFAULT_SITE_SETTINGS.homepage.secondaryCommandLabel, 80),
      heroMediaUrl: cleanMediaUrl(homepage.heroMediaId, DEFAULT_SITE_SETTINGS.homepage.heroMediaUrl),
      featuredCategoryOrder: categoryOrder.length > 0 ? [...new Set(categoryOrder)] : DEFAULT_SITE_SETTINGS.homepage.featuredCategoryOrder,
      featuredProductSlugs: [...new Set(productSlugs)],
    },
    company: {
      brand: normalizeCompanySection(company.brand, DEFAULT_SITE_SETTINGS.company.brand),
      support: normalizeCompanySection(company.support, DEFAULT_SITE_SETTINGS.company.support),
      business: {
        ...business,
        commandLabel: cleanText(record(company.business).commandLabel, DEFAULT_SITE_SETTINGS.company.business.commandLabel, 100),
      },
    },
    contact: {
      email: cleanEmail(contact.email, DEFAULT_SITE_SETTINGS.contact.email),
      phone: cleanText(contact.phone, DEFAULT_SITE_SETTINGS.contact.phone, 40),
    },
    footer: {
      companyName: cleanText(footer.companyName, DEFAULT_SITE_SETTINGS.footer.companyName, 120),
      address: cleanText(footer.address, DEFAULT_SITE_SETTINGS.footer.address, 240),
      navigation,
    },
    socialLinks,
    legal: {
      sellerName: cleanText(legal.sellerName, DEFAULT_SITE_SETTINGS.legal.sellerName, 160),
      responsiblePerson: cleanText(legal.responsiblePerson, DEFAULT_SITE_SETTINGS.legal.responsiblePerson, 160),
      address: cleanText(legal.address, DEFAULT_SITE_SETTINGS.legal.address, 240),
      phone: cleanText(legal.phone, DEFAULT_SITE_SETTINGS.legal.phone, 40),
      email: cleanEmail(legal.email, DEFAULT_SITE_SETTINGS.legal.email),
      priceNotice: cleanText(legal.priceNotice, DEFAULT_SITE_SETTINGS.legal.priceNotice, 500),
      additionalFees: cleanText(legal.additionalFees, DEFAULT_SITE_SETTINGS.legal.additionalFees, 1_000),
      payment: cleanText(legal.payment, DEFAULT_SITE_SETTINGS.legal.payment, 1_000),
      delivery: cleanText(legal.delivery, DEFAULT_SITE_SETTINGS.legal.delivery, 1_000),
      deliveryArea: cleanText(legal.deliveryArea, DEFAULT_SITE_SETTINGS.legal.deliveryArea, 240),
      returns: cleanText(legal.returns, DEFAULT_SITE_SETTINGS.legal.returns, 2_000),
      refunds: cleanText(legal.refunds, DEFAULT_SITE_SETTINGS.legal.refunds, 1_000),
      quantity: cleanText(legal.quantity, DEFAULT_SITE_SETTINGS.legal.quantity, 500),
    },
  };
}
