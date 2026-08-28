import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TubeNext",
  description: "YouTube 채널을 분석해 다음에 만들 컨텐츠를 추천합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
