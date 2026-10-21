"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileMenu({ links, makes }: { links: { href: string; label: string }[]; makes: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Menu" className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 overflow-y-auto bg-white p-5 shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-2 text-slate-500">
              <X className="h-5 w-5" />
            </button>
            <nav className="mt-6 space-y-1">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 font-semibold text-navy-900 hover:bg-navy-50">
                  {l.label}
                </Link>
              ))}
            </nav>
            {makes.length > 0 && (
              <>
                <div className="mt-6 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Shop by make</div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {makes.map((m) => (
                    <Link key={m.href} href={m.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-navy-50">
                      {m.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
