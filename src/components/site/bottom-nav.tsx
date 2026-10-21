"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, House, MessageCircle, Tractor, Wrench } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/cars", label: "Cars", icon: Car },
  { href: "/parts", label: "Parts", icon: Wrench },
  { href: "/machinery", label: "Machinery", icon: Tractor },
] as const;

/** Detail pages (/cars/<id>, /parts/<id>, /machinery/<id>) show their own sticky contact bar instead. */
const DETAIL = /^\/(cars|parts|machinery)\/[^/]+/;

/** Phone-only tab bar (frosted glass) with the five things customers do most. */
export function BottomNav({ wa }: { wa: string | null }) {
  const pathname = usePathname();
  if (DETAIL.test(pathname)) return null;
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const item = "flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors";

  return (
    <nav aria-label="Main" className="glass-strong fixed inset-x-2 bottom-2 z-50 flex rounded-2xl pb-[env(safe-area-inset-bottom)] lg:hidden">
      {TABS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`${item} ${active(href) ? "text-white" : "text-white/60 hover:text-white"}`}>
          <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active(href) ? "bg-[var(--accent)] shadow-lg shadow-brand-900/40" : ""}`}>
            <Icon className="h-5 w-5" />
          </span>
          {label}
        </Link>
      ))}
      {wa ? (
        <a href={wa} target="_blank" rel="noreferrer" className={`${item} text-[#4ADE80]`}>
          <span className="flex h-7 w-12 items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </span>
          Chat
        </a>
      ) : (
        <Link href="/contact" className={`${item} ${active("/contact") ? "text-white" : "text-white/60"}`}>
          <span className="flex h-7 w-12 items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </span>
          Contact
        </Link>
      )}
    </nav>
  );
}
