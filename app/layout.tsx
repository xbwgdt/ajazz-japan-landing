import type { Metadata } from "next";
import "./globals.css";
import "./survey/survey.css";

const siteUrl = "https://ajazz.jp";

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
        url: "/images/ak820maxultra.webp",
        width: 800,
        height: 800,
        alt: "AJAZZ AK820 MAX ULTRA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AJAZZ JAPAN | 高性能ゲーミングデバイス",
    description:
      "ラピッドトリガーキーボードから高性能ワイヤレスマウスまで。AJAZZ JAPAN公式オンラインストア。",
    images: ["/images/ak820maxultra.webp"],
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
      <body>{children}</body>
    </html>
  );
}
