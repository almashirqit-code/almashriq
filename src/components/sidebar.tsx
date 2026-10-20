"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Car,
  Upload,
  Users,
  FileText,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  Banknote,
} from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { Role } from "@/lib/types";
import { signOut } from "@/app/actions";

type Item = { href: string; label: DictKey; icon: React.ElementType; roles?: Role[]; newTab?: boolean };

const ITEMS: Item[] = [
  { href: "/", label: "nav_dashboard", icon: LayoutDashboard },
  { href: "/stock", label: "nav_stock", icon: Car },
  { href: "/stock/import", label: "nav_import", icon: Upload, roles: ["admin", "manager"] },
  { href: "/customers", label: "nav_customers", icon: Users },
  { href: "/invoices", label: "nav_invoices", icon: FileText },
  { href: "/remittances", label: "nav_remittances", icon: Banknote },
  { href: "/users", label: "nav_users", icon: UserCog, roles: ["admin"] },
  { href: "/settings", label: "nav_settings", icon: Settings, roles: ["admin"] },
  { href: "/showroom", label: "nav_showroom", icon: Store, newTab: true },
];

export function Sidebar({
  role,
  name,
  email,
  companyName,
  logoUrl,
}: {
  role: Role;
  name: string;
  email: string;
  companyName: string;
  logoUrl?: string | null;
}) {
  const { t } = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/stock") return pathname === "/stock" || (pathname.startsWith("/stock/") && !pathname.startsWith("/stock/import"));
    return pathname.startsWith(href);
  };

  const nav = (
    <nav className="flex h-full flex-col">
      <Link href="/" className="block px-5 pb-4 pt-5" onClick={() => setOpen(false)}>
        {logoUrl ? (
          <span className="block rounded-lg bg-white px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName} className="mx-auto h-10 w-auto object-contain" />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/logo-light.png" alt={companyName} className="h-12 w-auto object-contain" />
        )}
        <span className="mt-1.5 block truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">ERP</span>
      </Link>
      <div className="mx-5 mb-3 flex h-[3px] overflow-hidden rounded-full">
        <div className="w-2/3 bg-brand-600" />
        <div className="w-1/3 bg-slate-700" />
      </div>
      <ul className="flex-1 space-y-0.5 px-3">
        {ITEMS.filter((i) => !i.roles || i.roles.includes(role)).map((i) => {
          const Icon = i.icon;
          const active = !i.newTab && isActive(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                target={i.newTab ? "_blank" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium transition ${
                  active ? "border-brand-600 bg-white/10 text-white" : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(i.label)}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 min-w-0">
          <div className="truncate text-sm font-medium text-white">{name}</div>
          <div className="truncate text-xs text-slate-400">{email}</div>
          <div className="mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            {t(`role_${role}` as DictKey)}
          </div>
        </div>
        <form action={signOut}>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" />
            {t("sign_out")}
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <button
        className="no-print fixed left-3 top-3 z-40 rounded-lg bg-slate-900 p-2 text-white lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 bg-[#0f172a] lg:block">{nav}</aside>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">
            <button className="absolute right-3 top-4 text-slate-400" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
