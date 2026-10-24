"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Overview", always: true },
  { href: "/account/invoices", label: "Invoices" },
  { href: "/account/payments", label: "Payments (TT)" },
  { href: "/account/reservations", label: "Reservations" },
  { href: "/account/cars", label: "My cars" },
  { href: "/account/statement", label: "Statement" },
  { href: "/account/inquiries", label: "Inquiries", always: true },
  { href: "/account/support", label: "Support chat", always: true },
];

/** Account tabs; scrolls sideways on phones. Pending accounts get Overview, Inquiries and Support chat. */
export function AccountNav({ active, unread = 0 }: { active: boolean; unread?: number }) {
  const path = usePathname();
  const on = (href: string) => (href === "/account" ? path === "/account" : path.startsWith(href));
  return (
    <nav aria-label="My account" className="-mx-4 mb-6 overflow-x-auto px-4">
      <ul className="flex w-max gap-1.5">
        {TABS.filter((t) => active || t.always).map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={on(t.href) ? "page" : undefined}
              className={`inline-flex h-11 items-center whitespace-nowrap rounded-xl px-4 text-sm font-bold transition ${
                on(t.href) ? "bg-[var(--accent)] text-white" : "glass hover:brightness-105"
              }`}
            >
              {t.label}
              {t.href === "/account/support" && unread > 0 && (
                <span className="ml-2 min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white" aria-label={`${unread} unread`}>
                  {unread}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
