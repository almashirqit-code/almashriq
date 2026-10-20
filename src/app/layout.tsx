import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", variable: "--font-jp" });

export const metadata: Metadata = {
  title: "Al Mashriq ERP",
  description: "Vehicle export ERP — stock, customers and invoicing",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${notoJp.variable}`}>
      <body className={locale === "ja" ? "font-[family-name:var(--font-jp)]" : "font-sans"}>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
