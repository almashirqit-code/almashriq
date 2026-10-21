import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle, Printer, Search, ChevronDown, Send } from "lucide-react";
import { getCompany, getFacets, getMakeTiles, whatsapp, SITE_URL } from "@/lib/public-site";
import { WorldClock } from "@/components/world-clock";
import { FxBadge } from "@/components/fx-badge";
import { getUsdJpy } from "@/lib/fx";
import { MobileMenu } from "@/components/site/mobile-menu";
import { BottomNav } from "@/components/site/bottom-nav";
import { BodyIcon } from "@/components/site/body-icon";
import { JsonLd } from "@/components/site/json-ld";
import "./site.css";

export const metadata: Metadata = {
  title: { default: "Japanese used cars for export — Al Mashriq Trading", template: "%s | Al Mashriq Trading" },
  description:
    "Al Mashriq Trading Co., Ltd. exports quality Japanese used cars and spare parts worldwide. Browse our stock, get a C&F quotation by RoRo or container.",
  openGraph: { type: "website", siteName: "Al Mashriq Trading", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#0b1020", width: "device-width", initialScale: 1 };

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [company, facets, makes, fx] = await Promise.all([getCompany(), getFacets(), getMakeTiles(), getUsdJpy()]);
  const wa = whatsapp(company, "Hello Al Mashriq, I'd like to know about your cars.");
  const bodies = facets.body.map(([b]) => b).filter((b) => !/^others?$/i.test(b)).slice(0, 14);
  const topMakes = makes.slice(0, 24);

  const links = [
    { href: "/", label: "Home" },
    { href: "/cars", label: "Stock list" },
    { href: "/parts", label: "Parts" },
    { href: "/machinery", label: "Machinery" },
    { href: "/how-to-buy", label: "How to buy" },
    { href: "/payment", label: "Payment" },
    { href: "/reviews", label: "Reviews" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ];
  const navLink = "block px-4 py-3 text-sm font-bold text-white/90 transition hover:bg-white/10 hover:text-white";
  const logo = company.logo_url || "/brand/logo.png";

  return (
    <div className="site-glass pb-nav">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          name: company.company_name,
          url: SITE_URL,
          logo: `${SITE_URL}/brand/logo.png`,
          email: company.email ?? undefined,
          telephone: company.phone ?? company.mobile ?? undefined,
          faxNumber: company.fax ?? undefined,
          address: company.address ? { "@type": "PostalAddress", streetAddress: company.address, addressCountry: "JP" } : undefined,
          areaServed: "Worldwide",
        }}
      />

      {/* Desktop info strip (on phones this lives in the menu) */}
      <div className="hidden border-b border-white/10 bg-black/25 text-[12px] text-white/70 lg:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-6 py-1.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <WorldClock labelClass="text-white/50" timeClass="font-semibold text-white" />
            <FxBadge fx={fx} className="[&_b]:text-white" />
            <span>
              <b className="text-white">{facets.available.toLocaleString()}</b> cars available now
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {company.email && (
              <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Mail className="h-3.5 w-3.5 text-rose-300" />
                {company.email}
              </a>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Phone className="h-3.5 w-3.5 text-rose-300" />
                {company.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Desktop header: logo, search, contact buttons */}
      <header className="hidden lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <Link href="/" className="shrink-0 rounded-xl bg-white/95 px-2 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={company.company_name} className="h-11 w-auto object-contain" />
          </Link>
          <form action="/cars" className="mx-auto w-full max-w-xl" role="search">
            <div className="glass flex overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-[var(--focus)]">
              <input name="q" placeholder="Search make, model, stock ID…" className="w-full !rounded-none !border-0 bg-transparent px-4 py-2.5 text-sm" aria-label="Search cars" />
              <button className="inline-flex items-center gap-1.5 bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-red-600">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </form>
          <div className="flex shrink-0 items-center gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white hover:brightness-110">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600">
              <Send className="h-4 w-4" /> Inquiry
            </Link>
          </div>
        </div>
      </header>

      {/* Sticky bar: compact logo + search + menu on phones, the full navigation on desktop */}
      <nav className="glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 lg:h-auto lg:px-4">
          <Link href="/" className="shrink-0 rounded-lg bg-white/95 px-1.5 py-1 lg:hidden" aria-label="Al Mashriq Trading home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" className="h-8 w-auto object-contain" />
          </Link>
          <ul className="hidden items-center lg:flex">
            {links.slice(0, 4).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={navLink}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="group relative">
              <span className={`${navLink} flex cursor-default items-center gap-1`}>
                Makes <ChevronDown className="h-3.5 w-3.5" />
              </span>
              <div className="glass-strong invisible absolute left-0 top-full w-[34rem] rounded-b-2xl p-4 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-3 gap-1">
                  {topMakes.map((m) => (
                    <Link key={m.slug} href={`/makes/${m.slug}`} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 hover:text-white">
                      {m.label}
                      <span className="text-xs text-white/40">{m.n}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </li>
            {bodies.length > 0 && (
              <li className="group relative">
                <span className={`${navLink} flex cursor-default items-center gap-1`}>
                  Body type <ChevronDown className="h-3.5 w-3.5" />
                </span>
                <div className="glass-strong invisible absolute left-0 top-full w-64 rounded-b-2xl p-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
                  {bodies.map((b) => (
                    <Link key={b} href={`/cars?body=${encodeURIComponent(b)}`} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-white/85 hover:bg-white/10 hover:text-white">
                      <BodyIcon type={b} className="h-5 w-10 shrink-0 text-white/80" />
                      {b}
                    </Link>
                  ))}
                </div>
              </li>
            )}
            {links.slice(4).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={navLink}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <form action="/cars" className="min-w-0 flex-1 lg:hidden" role="search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input name="q" placeholder="Search cars…" aria-label="Search cars" className="h-11 w-full !rounded-xl pl-9 pr-3" enterKeyHint="search" />
            </div>
          </form>
          <MobileMenu
            links={links}
            makes={topMakes.map((m) => ({ href: `/makes/${m.slug}`, label: m.label }))}
            contact={{ email: company.email, phone: company.phone ?? company.mobile, address: company.address, wa }}
            fx={fx}
          />
        </div>
        <div className="hidden h-0.5 bg-gradient-to-r from-[var(--accent)] via-rose-400/60 to-transparent lg:block" />
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer className="glass-lite mt-14 rounded-none border-x-0 border-b-0">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 lg:grid-cols-4 lg:px-6">
          <div className="col-span-2 lg:col-span-1">
            <span className="inline-block rounded-xl bg-white/95 px-2 py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.png" alt={company.company_name} className="h-11 w-auto object-contain" />
            </span>
            <p className="mt-4 text-sm leading-6 text-white/70">{company.company_name} exports quality Japanese used vehicles and spare parts worldwide by RoRo and container.</p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">Popular makes</div>
            <ul className="mt-3 space-y-1 text-sm">
              {makes.slice(0, 8).map((m) => (
                <li key={m.slug}>
                  <Link href={`/makes/${m.slug}`} className="inline-flex min-h-11 items-center text-white/70 hover:text-white">
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">Information</div>
            <ul className="mt-3 space-y-1 text-sm">
              {links.slice(1).map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center text-white/70 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 space-y-2.5 text-sm text-white/75 lg:col-span-1">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">Contact</div>
            {company.address && (
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                <span className="whitespace-pre-line">{company.address}</span>
              </div>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`} className="flex min-h-11 items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4 text-rose-300" /> {company.phone}
              </a>
            )}
            {company.fax && (
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-rose-300" /> Fax {company.fax}
              </div>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="flex min-h-11 items-center gap-2 break-all hover:text-white">
                <Mail className="h-4 w-4 shrink-0 text-rose-300" /> {company.email}
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-4 font-bold text-white hover:brightness-110">
                <MessageCircle className="h-4 w-4" /> WhatsApp{company.mobile ? ` · ${company.mobile}` : ""}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
          © {new Date().getFullYear()} {company.company_name}. All rights reserved.
        </div>
      </footer>

      <BottomNav wa={wa} />

      {/* Desktop-only WhatsApp bubble (phones have it in the bottom bar and the menu) */}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-5 right-5 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/40 transition hover:scale-105 lg:flex"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}
