"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, ChevronDown, Car, FileText, Users, Banknote } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { Role } from "@/lib/types";

const NEW_ITEMS: { href: string; label: DictKey; icon: React.ElementType; grad: string; roles?: Role[] }[] = [
  { href: "/stock/new", label: "top_new_vehicle", icon: Car, grad: "from-rose-500 to-brand-600", roles: ["admin", "manager"] },
  { href: "/invoices/new", label: "top_new_invoice", icon: FileText, grad: "from-fuchsia-500 to-pink-600" },
  { href: "/customers/new", label: "top_new_customer", icon: Users, grad: "from-sky-400 to-blue-600" },
  { href: "/remittances/new", label: "top_new_remittance", icon: Banknote, grad: "from-emerald-400 to-teal-600", roles: ["admin", "manager"] },
];

export function TopbarSearch() {
  const { t } = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      className="relative hidden w-full max-w-md md:block"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/stock?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("top_search")}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-10 text-sm outline-none transition placeholder:text-slate-400 hover:bg-white focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
      />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-400">/</kbd>
    </form>
  );
}

export function QuickCreate({ role }: { role: Role }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const items = NEW_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-primary px-3 py-1.5" aria-expanded={open}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">{t("top_new")}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xl shadow-slate-900/10">
          {items.map((i) => {
            const Icon = i.icon;
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow ${i.grad}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {t(i.label)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
