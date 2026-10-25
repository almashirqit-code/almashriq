import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

const notoJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", variable: "--font-jp" });

// The ERP is private: keep it out of search results.
export const metadata: Metadata = {
  title: { default: "Al Mashriq ERP", template: "%s · Al Mashriq ERP" },
  robots: { index: false, follow: false, nocache: true },
};

// The English/Japanese switch (locale cookie) is read here rather than in the root layout,
// so only the ERP is rendered per request and the public site stays cacheable.
export default async function AdminRoot({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <div lang={locale} className={`${notoJp.variable} ${locale === "ja" ? "font-[family-name:var(--font-jp)]" : ""}`}>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </div>
  );
}
