import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

// Noto Sans JP is loaded from Google Fonts at runtime (Japanese UI only) rather than through
// next/font: Google sometimes serves the build machine font URLs next/font can't parse, which
// fails the Cloudflare build. The CSP already allows fonts.googleapis.com / fonts.gstatic.com.
const NOTO_JP = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap";

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
    <div lang={locale} className={locale === "ja" ? "font-[family-name:'Noto_Sans_JP',sans-serif]" : undefined}>
      {locale === "ja" && <link rel="stylesheet" href={NOTO_JP} precedence="default" />}
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </div>
  );
}
