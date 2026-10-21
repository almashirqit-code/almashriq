import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle, Printer, Search, ChevronDown, Send, Car } from "lucide-react";
import { getCompany, getFacets, getMakeTiles, whatsapp, SITE_URL } from "@/lib/public-site";
import { JapanClock } from "@/components/site/japan-clock";
import { MobileMenu } from "@/components/site/mobile-menu";
import { JsonLd } from "@/components/site/json-ld";

export const metadata: Metadata = {
  title: { default: "Japanese used cars for export — Al Mashriq Trading", template: "%s | Al Mashriq Trading" },
  description:
    "Al Mashriq Trading Co., Ltd. exports quality Japanese used cars and spare parts worldwide. Browse our stock, get a C&F quotation by RoRo or container.",
  openGraph: { type: "website", siteName: "Al Mashriq Trading", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

const BODY_LINKS = ["SUV", "Sedan", "Hatchback", "Van", "Truck", "Wagon", "Pickup", "Bus"];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [company, facets, makes] = await Promise.all([getCompany(), getFacets(), getMakeTiles()]);
  const wa = whatsapp(company, "Hello Al Mashriq, I'd like to know about your cars.");
  const bodies = facets.body.map(([b]) => b).filter((b) => BODY_LINKS.some((x) => b.toLowerCase().includes(x.toLowerCase()))).slice(0, 10);
  const topMakes = makes.slice(0, 24);

  const links = [
    { href: "/", label: "Home" },
    { href: "/cars", label: "Stock list" },
    { href: "/how-to-buy", label: "How to buy" },
    { href: "/reviews", label: "Reviews" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
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

      {/* Top bar */}
      <div className="bg-navy-950 text-[12px] text-navy-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-4 py-1.5 lg:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <JapanClock />
            <span className="hidden sm:inline">
              <b className="text-white">{facets.available.toLocaleString()}</b> cars available now
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {company.email && (
              <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Mail className="h-3.5 w-3.5 text-brand-400" />
                {company.email}
              </a>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Phone className="h-3.5 w-3.5 text-brand-400" />
                {company.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-6">
          <Link href="/" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={company.logo_url || "/brand/logo.png"} alt={company.company_name} className="h-12 w-auto object-contain" />
          </Link>
          <form action="/cars" className="mx-auto hidden w-full max-w-xl md:block" role="search">
            <div className="flex overflow-hidden rounded-xl ring-2 ring-navy-800 focus-within:ring-brand-600">
              <input name="q" placeholder="Search make, model, stock ID…" className="w-full px-4 py-2.5 text-sm outline-none" aria-label="Search cars" />
              <button className="inline-flex items-center gap-1.5 bg-navy-800 px-4 text-sm font-bold text-white hover:bg-navy-900">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 sm:inline-flex">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
              <Send className="h-4 w-4" /> Inquiry
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-navy-800 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center px-2 lg:px-4">
          <ul className="hidden items-center lg:flex">
            {links.slice(0, 2).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block px-4 py-3 text-sm font-bold text-white hover:bg-navy-900">
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="group relative">
              <span className="flex cursor-default items-center gap-1 px-4 py-3 text-sm font-bold text-white group-hover:bg-navy-900">
                Makes <ChevronDown className="h-3.5 w-3.5" />
              </span>
              <div className="invisible absolute left-0 top-full w-[34rem] rounded-b-2xl bg-white p-4 opacity-0 shadow-2xl ring-1 ring-slate-200 transition group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-3 gap-1">
                  {topMakes.map((m) => (
                    <Link key={m.slug} href={`/makes/${m.slug}`} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-navy-50 hover:text-navy-900">
                      {m.label}
                      <span className="text-xs text-slate-400">{m.n}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </li>
            {bodies.length > 0 && (
              <li className="group relative">
                <span className="flex cursor-default items-center gap-1 px-4 py-3 text-sm font-bold text-white group-hover:bg-navy-900">
                  Body type <ChevronDown className="h-3.5 w-3.5" />
                </span>
                <div className="invisible absolute left-0 top-full w-56 rounded-b-2xl bg-white p-2 opacity-0 shadow-2xl ring-1 ring-slate-200 transition group-hover:visible group-hover:opacity-100">
                  {bodies.map((b) => (
                    <Link key={b} href={`/cars?body=${encodeURIComponent(b)}`} className="block rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-navy-50">
                      {b}
                    </Link>
                  ))}
                </div>
              </li>
            )}
            {links.slice(2).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block px-4 py-3 text-sm font-bold text-white hover:bg-navy-900">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/cars" className="px-2 py-3 text-sm font-bold text-white lg:hidden">
            <Car className="mr-1 inline h-4 w-4" /> Stock list
          </Link>
          <form action="/cars" className="mx-2 flex-1 md:hidden" role="search">
            <input name="q" placeholder="Search…" aria-label="Search cars" className="w-full rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/60 outline-none" />
          </form>
          <div className="ml-auto">
            <MobileMenu links={links} makes={topMakes.map((m) => ({ href: `/makes/${m.slug}`, label: m.label }))} />
          </div>
        </div>
        <div className="h-1 bg-brand-600" />
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer className="mt-16 bg-navy-950 text-navy-100">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-light.png" alt={company.company_name} className="h-12 w-auto object-contain" />
            <p className="mt-4 text-sm leading-6 text-navy-200">
              {company.company_name} exports quality Japanese used vehicles and spare parts worldwide by RoRo and container.
            </p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">Popular makes</div>
            <ul className="mt-3 grid grid-cols-2 gap-1.5 text-sm">
              {makes.slice(0, 12).map((m) => (
                <li key={m.slug}>
                  <Link href={`/makes/${m.slug}`} className="hover:text-white">
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">Information</div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[...links.slice(1), { href: "/sitemap.xml", label: "Sitemap" }].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white">Contact</div>
            {company.address && (
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span className="whitespace-pre-line">{company.address}</span>
              </div>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`} className="flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4 text-brand-400" /> {company.phone}
              </a>
            )}
            {company.fax && (
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-brand-400" /> Fax {company.fax}
              </div>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-white">
                <Mail className="h-4 w-4 text-brand-400" /> {company.email}
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-bold text-white hover:bg-emerald-600">
                <MessageCircle className="h-4 w-4" /> WhatsApp{company.mobile ? ` · ${company.mobile}` : ""}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-navy-300">
          © {new Date().getFullYear()} {company.company_name}. All rights reserved.
        </div>
      </footer>

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-700/40 transition hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}
