import type { Metadata } from "next";
import "./survey/survey.css";

const siteUrl = "https://ajazz-japan-landing.vercel.app";

export const metadata: Metadata = {
  title: "AJAZZ 日本公式 - ゲーミングキーボード＆マウス",
  description:
    "プロゲーマーも愛用する、高性能キーボード＆マウス。楽天公式ストアで販売中。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "AJAZZ Japan",
    title: "AJAZZ 日本公式 - ゲーミングキーボード＆マウス",
    description:
      "プロゲーマーも愛用する、高性能キーボード＆マウス。楽天公式ストアで販売中。",
    images: [
      {
        url: `${siteUrl}/images/ak029.webp`,
        width: 800,
        height: 800,
        alt: "AJAZZ 日本公式",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@AjazzJapan",
    title: "AJAZZ 日本公式 - ゲーミングキーボード＆マウス",
    description:
      "プロゲーマーも愛用する、高性能キーボード＆マウス。楽天公式ストアで販売中。",
    images: [`${siteUrl}/images/ak029.webp`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-BVGSTWFHYF"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-BVGSTWFHYF');
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
