import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "요거트아이스크림의정석 | 매장 관리",
  description: "매출·세금을 스마트하게 관리하는 매장 전용 앱",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "매장관리",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
