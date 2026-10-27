import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.almashriqtrading.site").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Al Mashriq Trading Co., Ltd. — Japanese used cars", template: "%s · Al Mashriq" },
  description:
    "Buy quality Japanese used cars, spare parts and machinery for export from Al Mashriq Trading Co., Ltd. in Japan. Browse live stock with photos and FOB prices, and get a C&F quotation by RoRo or container to your port worldwide.",
  applicationName: "Al Mashriq Trading",
  keywords: ["Japanese used cars", "used cars for export", "Japan car exporter", "used car parts Japan", "RoRo shipping", "container shipping cars", "Al Mashriq Trading"],
};

export const viewport = { themeColor: "#0a0a0c" };

// No cookies or headers here: reading them in the root layout makes every page dynamic, so the
// public site could never be cached. The ERP's English/Japanese switch lives in app/admin/layout.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
