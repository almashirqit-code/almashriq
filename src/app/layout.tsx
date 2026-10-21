import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", variable: "--font-jp" });

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.almashriqtrading.site").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Al Mashriq Trading Co., Ltd. — Japanese used cars", template: "%s · Al Mashriq" },
  description: "Al Mashriq Trading Co., Ltd. — Japanese used cars and spare parts exporter.",
  applicationName: "Al Mashriq Trading",
};

export const viewport = { themeColor: "#d71920" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${jakarta.variable} ${notoJp.variable}`}>
      <body className={locale === "ja" ? "font-[family-name:var(--font-jp)]" : "font-sans"}>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
