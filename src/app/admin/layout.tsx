import type { Metadata } from "next";

// The ERP is private: keep it out of search results.
export const metadata: Metadata = {
  title: { default: "Al Mashriq ERP", template: "%s · Al Mashriq ERP" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
