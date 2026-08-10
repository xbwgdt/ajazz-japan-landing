import type { Metadata } from "next";
import { Barlow_Condensed, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import "./storefront.css";
import { CartProvider } from "../components/store/CartProvider";

const siteUrl = "https://ajazz.jp";

const storeDisplay = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-store-display",
  display: "swap",
});

const storeBody = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-store-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AJAZZ JAPAN | 高性能ゲーミングデバイス",
    template: "%s | AJAZZ JAPAN",
  },
  description:
    "AJAZZ JAPAN公式オンラインストア。ラピッドトリガーキーボード、ゲーミングマウス、ストリームコントローラーを全国送料無料でお届けします。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "AJAZZ JAPAN",
    title: "AJAZZ JAPAN | 高性能ゲーミングデバイス",
    description:
      "ラピッドトリガーキーボードから高性能ワイヤレスマウスまで。AJAZZ JAPAN公式オンラインストア。",
    images: [
      {
        url: "/images/ajazz-gaming-desk-hero.webp",
        width: 1672,
        height: 941,
        alt: "AJAZZ JAPAN gaming desk setup",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AJAZZ JAPAN | 高性能ゲーミングデバイス",
    description:
      "ラピッドトリガーキーボードから高性能ワイヤレスマウスまで。AJAZZ JAPAN公式オンラインストア。",
    images: ["/images/ajazz-gaming-desk-hero.webp"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-BVGSTWFHYF" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-BVGSTWFHYF');",
          }}
        />
      </head>
      <body className={`${storeDisplay.variable} ${storeBody.variable}`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
