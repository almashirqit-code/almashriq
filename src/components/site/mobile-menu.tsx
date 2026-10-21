"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Menu, MessageCircle, Phone, X } from "lucide-react";
import { WorldClock } from "@/components/world-clock";
import { FxBadge } from "@/components/fx-badge";
import type { Fx } from "@/lib/fx";

type Contact = { email: string | null; phone: string | null; address: string | null; wa: string | null };

/** Phone menu: a frosted-glass sheet with the links, makes, contact details and live Japan time / USD-JPY. */
export function MobileMenu({ links, makes, contact, fx }: { links: { href: string; label: string }[]; makes: { href: string; label: string }[]; contact: Contact; fx: Fx | null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Close on navigation; lock page scroll and close on Escape while open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10 lg:hidden">
        <Menu className="h-6 w-6" />
      </button>
      {open && mounted ? createPortal((
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col overflow-y-auto rounded-l-3xl pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Menu</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-1 px-3">
              {links.map((l) => {
                const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex min-h-12 items-center rounded-xl px-4 text-base font-bold ${active ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/90 hover:bg-white/10"}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            {makes.length > 0 && (
              <div className="mt-5 px-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Shop by make</div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {makes.map((m) => (
                    <Link key={m.href} href={m.href} className="flex min-h-11 items-center rounded-xl bg-white/5 px-3 text-sm font-semibold text-white/90 hover:bg-white/12">
                      {m.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-auto space-y-2.5 px-5 pb-6 pt-6 text-sm text-white/80">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                <WorldClock zones={["japan"]} labelClass="text-white/50" timeClass="font-semibold text-white" />
                <FxBadge fx={fx} className="[&_b]:text-white" />
              </div>
              {contact.address && (
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                  <span className="whitespace-pre-line">{contact.address}</span>
                </div>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex min-h-10 items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4 text-rose-300" /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex min-h-10 items-center gap-2 break-all hover:text-white">
                  <Mail className="h-4 w-4 shrink-0 text-rose-300" /> {contact.email}
                </a>
              )}
              {contact.wa && (
                <a href={contact.wa} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 font-bold text-jet-950">
                  <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      ), document.body) : null}
    </>
  );
}
