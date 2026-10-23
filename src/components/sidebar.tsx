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
  Inbox,
  Newspaper,
  Star,
  Banknote,
  ExternalLink,
  BookmarkCheck,
  Handshake,
  Wrench,
  Tractor,
  Activity,
  UserPlus,
} from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { Role } from "@/lib/types";
import { signOut } from "@/app/actions";
import { AvatarPicker } from "./avatar-picker";
import { Logo } from "./brand/logo";

type Item = {
  href: string;
  label: DictKey;
  icon: React.ElementType;
  roles?: Role[];
  newTab?: boolean;
  /** Sub-menu shown under the item. */
  children?: { href: string; label: DictKey }[];
};

const DOC_SUBPAGES = ["/admin/invoices/quotations", "/admin/invoices/auction-deposits"];

const GROUPS: { label: DictKey; items: Item[] }[] = [
  {
    label: "grp_overview",
    items: [{ href: "/admin", label: "nav_dashboard", icon: LayoutDashboard }],
  },
  {
    label: "grp_inventory",
    items: [
      { href: "/admin/stock", label: "nav_stock", icon: Car },
      { href: "/admin/third-party", label: "nav_third_party", icon: Handshake },
      { href: "/admin/parts", label: "nav_parts", icon: Wrench },
      { href: "/admin/machinery", label: "nav_machinery", icon: Tractor },
      { href: "/admin/stock/import", label: "nav_import", icon: Upload, roles: ["admin", "manager"] },
    ],
  },
  {
    label: "grp_sales",
    items: [
      { href: "/admin/inquiries", label: "nav_inquiries", icon: Inbox },
      { href: "/admin/customers", label: "nav_customers", icon: Users },
      { href: "/admin/portal-signups", label: "nav_portal_signups", icon: UserPlus, roles: ["admin", "manager"] },
      { href: "/admin/reservations", label: "nav_reservations", icon: BookmarkCheck },
      {
        href: "/admin/invoices",
        label: "nav_invoices",
        icon: FileText,
        children: [
          { href: "/admin/invoices", label: "doc_invoice" },
          { href: "/admin/invoices/quotations", label: "doc_quotation" },
          { href: "/admin/invoices/auction-deposits", label: "doc_auction_deposit" },
        ],
      },
      { href: "/admin/remittances", label: "nav_remittances", icon: Banknote },
    ],
  },
  {
    label: "grp_website",
    items: [
      { href: "/admin/blog", label: "nav_blog", icon: Newspaper, roles: ["admin", "manager"] },
      { href: "/admin/reviews", label: "nav_reviews", icon: Star, roles: ["admin", "manager"] },
      { href: "/", label: "nav_showroom", icon: Store, newTab: true },
    ],
  },
  {
    label: "grp_admin",
    items: [
      { href: "/admin/users", label: "nav_users", icon: UserCog, roles: ["admin"] },
      { href: "/admin/settings", label: "nav_settings", icon: Settings, roles: ["admin", "manager"] },
      { href: "/admin/system", label: "nav_system", icon: Activity, roles: ["admin"] },
    ],
  },
];

export function Sidebar({
  role,
  name,
  email,
  companyName,
  logoUrl,
  office = null,
  userId,
  avatarUrl = null,
  badges = {},
}: {
  /** Counts shown next to menu items, keyed by href (e.g. pending portal sign-ups). */
  badges?: Record<string, number>;
  role: Role;
  name: string;
  email: string;
  companyName: string;
  logoUrl?: string | null;
  office?: string | null;
  userId: string;
  avatarUrl?: string | null;
}) {
  const { t } = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/stock") return pathname === "/admin/stock" || (pathname.startsWith("/admin/stock/") && !pathname.startsWith("/admin/stock/import"));
    return pathname.startsWith(href);
  };
  // Invoices sub-menu: quotations / auction deposits have their own pages; everything else under /admin/invoices is "Invoices".
  const isSubActive = (href: string) =>
    href === "/admin/invoices" ? pathname.startsWith(href) && !DOC_SUBPAGES.some((p) => pathname.startsWith(p)) : pathname.startsWith(href);


  const nav = (
    <nav className="relative flex h-full flex-col overflow-hidden">
      {/* colour glows */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cerulean-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />

      <Link href="/admin" className="relative block px-5 pb-3 pt-5" onClick={() => setOpen(false)}>
        {logoUrl ? (
          <span className="block rounded-xl bg-white px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={companyName} className="mx-auto h-10 w-auto object-contain" />
          </span>
        ) : (
          <Logo size="md" alt={companyName} />
        )}
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 ring-1 ring-white/10">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          ERP
        </span>
      </Link>

      <div className="relative flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
        {GROUPS.map((g) => {
          const items = g.items.filter((i) => !i.roles || i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g.label}>
              <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{t(g.label)}</div>
              <ul className="space-y-0.5">
                {items.map((i) => {
                  const Icon = i.icon;
                  const active = !i.newTab && isActive(i.href);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        target={i.newTab ? "_blank" : undefined}
                        onClick={() => setOpen(false)}
                        className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-white/[0.08] text-white shadow-inner ring-1 ring-white/10"
                            : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                            active ? "bg-cerulean-600 text-white shadow-lg shadow-cerulean-900/40" : "bg-white/[0.06] text-slate-300 group-hover:bg-white/10 group-hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 truncate">{t(i.label)}</span>
                        {badges[i.href] ? (
                          <span className="min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{badges[i.href]}</span>
                        ) : null}
                        {i.newTab && <ExternalLink className="h-3.5 w-3.5 text-slate-500" />}
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_#ec3a40]" />}
                      </Link>
                      {i.children && (
                        <ul className="ml-[1.6rem] mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                          {i.children.map((c) => {
                            const on = isSubActive(c.href);
                            return (
                              <li key={c.href}>
                                <Link
                                  href={c.href}
                                  onClick={() => setOpen(false)}
                                  aria-current={on ? "page" : undefined}
                                  className={`block rounded-lg px-2.5 py-1.5 text-[13px] transition ${on ? "bg-white/[0.08] font-semibold text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}
                                >
                                  {t(c.label)}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="relative m-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <AvatarPicker userId={userId} name={name || email} current={avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{name}</div>
            <div className="truncate text-[11px] text-slate-400">
              {t(`role_${role}` as DictKey)}
              {office ? ` · ${office}` : ""}
            </div>
          </div>
          <form action={signOut}>
            <button
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title={t("sign_out")}
              aria-label={t("sign_out")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </nav>
  );

  const bg = "bg-jet-950";

  return (
    <>
      <button
        className="no-print fixed left-3 top-2.5 z-40 rounded-xl bg-jet-950 p-2 text-white shadow-lg ring-1 ring-white/10 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <aside className={`no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block ${bg}`}>{nav}</aside>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className={`absolute inset-y-0 left-0 w-72 ${bg}`}>
            <button className="absolute right-3 top-4 z-10 text-slate-400" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
