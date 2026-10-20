import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", variable: "--font-jp" });

export const metadata: Metadata = {
  title: { default: "Al Mashriq Trading — ERP", template: "%s · Al Mashriq ERP" },
  description: "Al Mashriq Trading Co., Ltd. — car & spare parts export ERP",
  applicationName: "Al Mashriq ERP",
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
