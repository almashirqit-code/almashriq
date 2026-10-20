import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle, Printer } from "lucide-react";
import { getCompany, siteBase, whatsapp } from "@/lib/public-site";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [company, base] = await Promise.all([getCompany(), siteBase()]);
  const wa = whatsapp(company, "Hello Al Mashriq, I'd like to know about your cars.");
  const nav = [
    { href: base || "/", label: "Home" },
    { href: `${base}/cars`, label: "Cars in stock" },
    { href: `${base}/cars?sort=price_asc`, label: "Best prices" },
    { href: "#contact", label: "Contact" },
  ];
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <div className="bg-[#0d1024] text-[12px] text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {company.email && (
              <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Mail className="h-3.5 w-3.5 text-rose-400" />
                {company.email}
              </a>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`} className="inline-flex items-center gap-1.5 hover:text-white">
                <Phone className="h-3.5 w-3.5 text-rose-400" />
                {company.phone}
              </a>
            )}
          </div>
          <span className="hidden sm:inline">Used cars & spare parts exporter from Japan</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 lg:px-8">
          <Link href={base || "/"} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={company.logo_url || "/brand/logo.png"} alt={company.company_name} className="h-11 w-auto object-contain" />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.label} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-brand-700">
                {n.label}
              </Link>
            ))}
          </nav>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-500/30 transition hover:shadow-lg md:ml-0"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-1.5 md:hidden">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <footer id="contact" className="mt-16 bg-gradient-to-br from-[#0d1024] via-[#151233] to-[#1b0f24] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 lg:px-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-light.png" alt={company.company_name} className="h-12 w-auto object-contain" />
            <p className="mt-3 text-sm text-slate-400">
              {company.company_name} — Japanese used vehicles and spare parts, exported worldwide by RoRo and container.
            </p>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contact</div>
            {company.address && (
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span className="whitespace-pre-line">{company.address}</span>
              </div>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`} className="flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4 text-rose-400" /> {company.phone}
              </a>
            )}
            {company.fax && (
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-rose-400" /> Fax {company.fax}
              </div>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-white">
                <Mail className="h-4 w-4 text-rose-400" /> {company.email}
              </a>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Talk to us</div>
            <p className="text-slate-400">Send us the stock ID of the car you like and your destination port — we reply with a full C&F quotation.</p>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-bold text-white hover:bg-emerald-600">
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp{company.mobile ? ` · ${company.mobile}` : ""}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {company.company_name}. All rights reserved.
        </div>
      </footer>

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-xl shadow-emerald-600/40 transition hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}
