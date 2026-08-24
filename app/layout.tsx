import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-serif-kr";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title: "사잇결",
    description: "트친소 카드 메이커",
    applicationName: "사잇결",
    keywords: ["트친소", "트친소표", "트친소 카드", "친구 소개", "사잇결"],
    openGraph: {
      title: "사잇결",
      description: "트친소 카드 메이커",
      type: "website",
      locale: "ko_KR",
      siteName: "사잇결",
      images: [
        {
          url: socialImage,
          width: 1536,
          height: 1024,
          alt: "사잇결 — 트친소 카드 메이커",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "사잇결",
      description: "트친소 카드 메이커",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
