"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Car, Wallet, MessagesSquare } from "lucide-react";

type Tab = { href: string; label: string };
const SECTIONS: { label: string; icon: typeof Home; always?: boolean; tabs: Tab[] }[] = [
  { label: "Home", icon: Home, always: true, tabs: [{ href: "/account", label: "Home" }] },
  {
    label: "My cars",
    icon: Car,
    tabs: [
      { href: "/account/cars", label: "My cars" },
      { href: "/account/reservations", label: "Reservations" },
    ],
  },
  {
    label: "Payments",
    icon: Wallet,
    tabs: [
      { href: "/account/invoices", label: "Invoices" },
      { href: "/account/payments", label: "Pay & upload slip" },
      { href: "/account/statement", label: "Statement" },
    ],
  },
  {
    label: "Messages",
    icon: MessagesSquare,
    always: true,
    tabs: [
      { href: "/account/support", label: "Chat" },
      { href: "/account/inquiries", label: "Inquiries" },
    ],
  },
];

/**
 * Four sections (Home, My cars, Payments, Messages) with sub-tabs for the pages inside each.
 * Pending accounts get Home and Messages; Profile sits behind the picture in the header.
 */
export function AccountNav({ active, unread = 0 }: { active: boolean; unread?: number }) {
  const path = usePathname();
  const on = (href: string) => (href === "/account" ? path === "/account" : path.startsWith(href));
  const sections = SECTIONS.filter((s) => active || s.always);
  const current = sections.find((s) => s.tabs.some((t) => on(t.href)));

  return (
    <nav aria-label="My account" className="mb-6">
      <ul className={`grid gap-1.5 ${sections.length === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
        {sections.map((s) => {
          const here = s === current;
          const Icon = s.icon;
          return (
            <li key={s.label}>
              <Link
                href={s.tabs[0].href}
                aria-current={here ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-bold transition sm:h-12 sm:flex-row sm:gap-2 sm:text-sm ${
                  here ? "bg-[var(--accent)] text-white" : "glass hover:brightness-105"
                }`}
              >
                <Icon className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
                {s.label}
                {s.label === "Messages" && unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white sm:static" aria-label={`${unread} unread`}>
                    {unread}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {current && current.tabs.length > 1 && (
        <ul className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4" aria-label={current.label}>
          {current.tabs.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on(t.href) ? "page" : undefined}
                className={`inline-flex h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
                  on(t.href) ? "glass font-bold" : "text-white/70 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
