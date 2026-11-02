"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Car, ChevronRight, CreditCard, House, Mail, MapPin, Menu, MessageCircle, Newspaper, Phone, Send, Star, Tractor, UserRound, Wrench, X, type LucideIcon } from "lucide-react";
import { WorldClock } from "@/components/world-clock";
import { FxBadge } from "@/components/fx-badge";
import type { Fx } from "@/lib/fx";

/** An icon for each menu link (unknown links get a chevron). */
const ICONS: Record<string, LucideIcon> = { "/": House, "/cars": Car, "/parts": Wrench, "/machinery": Tractor, "/how-to-buy": BookOpen, "/payment": CreditCard, "/reviews": Star, "/blog": Newspaper, "/contact": Send, "/account": UserRound };

/** Already in the phone bottom tab bar, so the menu leaves them out. */
const IN_TAB_BAR = new Set(["/", "/cars", "/parts", "/machinery"]);

type Contact = { email: string | null; phone: string | null; address: string | null; wa: string | null };

/** Phone menu: a frosted-glass sheet with the links, makes, contact details and live Japan time / USD-JPY. */
export function MobileMenu({ links, makes, contact, fx }: { links: { href: string; label: string }[]; makes: { href: string; label: string; logo?: string | null }[]; contact: Contact; fx: Fx | null }) {
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
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          {/* Portalled to <body>, outside the .site-glass theme scope, so it carries its own light frosted-glass styling. */}
          <div className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col overflow-y-auto rounded-l-3xl border-l border-[#ffffff]/70 bg-[#ffffff]/70 pb-[env(safe-area-inset-bottom)] text-[#0a0a0c] shadow-[0_20px_60px_rgb(15_23_42/0.3),inset_1px_0_0_rgb(255_255_255/0.8)] backdrop-blur-2xl backdrop-saturate-150 [color-scheme:light]">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Menu</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-900/5">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="space-y-1 px-3">
              {links.filter((l) => !IN_TAB_BAR.has(l.href)).map((l) => {
                const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                const Icon = ICONS[l.href] ?? ChevronRight;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-bold ${active ? "bg-[#ffffff]/80 text-brand-700 shadow-sm ring-1 ring-brand-600/20" : "text-slate-800 hover:bg-[#ffffff]/60"}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-brand-600 text-[#ffffff]" : "bg-[#ffffff]/70 text-brand-700 ring-1 ring-slate-900/5"}`}>
                      <Icon className="h-[1.1rem] w-[1.1rem]" />
                    </span>
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            {makes.length > 0 && (
              <div className="mt-5 px-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">Shop by make</div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {makes.map((m) => (
                    <Link key={m.href} href={m.href} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#ffffff]/60 px-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-900/5 hover:bg-[#ffffff]/90">
                      <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-[#ffffff]">
                        {m.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.logo} alt="" loading="lazy" className="max-h-6 max-w-8 object-contain" />
                        ) : (
                          <span className="text-xs font-black text-slate-700">{m.label.slice(0, 1)}</span>
                        )}
                      </span>
                      <span className="truncate">{m.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-auto space-y-2.5 px-5 pb-6 pt-6 text-sm text-slate-700">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <WorldClock zones={["japan"]} labelClass="text-slate-600" timeClass="font-semibold text-slate-900" />
                <FxBadge fx={fx} className="[&_b]:text-slate-900" />
              </div>
              {contact.address && (
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span className="whitespace-pre-line">{contact.address}</span>
                </div>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex min-h-10 items-center gap-2 hover:text-slate-900">
                  <Phone className="h-4 w-4 text-brand-600" /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex min-h-10 items-center gap-2 break-all hover:text-slate-900">
                  <Mail className="h-4 w-4 shrink-0 text-brand-600" /> {contact.email}
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
