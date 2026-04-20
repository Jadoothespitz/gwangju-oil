import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "오매나! 광주 기름 싸다!",
  description: "광주광역시 상생카드·온누리상품권 사용 가능한 최저가 주유소 찾기",
  openGraph: {
    title: "오매나! 광주 기름 싸다!",
    description: "광주광역시 상생카드·온누리상품권 사용 가능한 최저가 주유소 찾기",
    url: "https://gwangju-oil.vercel.app",
    siteName: "오매나기름집",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "오매나! 광주 기름 싸다!",
    description: "광주광역시 상생카드·온누리상품권 사용 가능한 최저가 주유소 찾기",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2046E5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Paperlogy:wght@700;800;900&display=swap"
        />
      </head>
      <body className="min-h-dvh flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
