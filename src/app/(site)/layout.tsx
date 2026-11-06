import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle, Search, ChevronDown, Send, UserRound } from "lucide-react";
import { getCompany, getFacets, getMakeTiles, whatsapp, SITE_URL, SUPPORT_EMAIL } from "@/lib/public-site";
import { WorldClock } from "@/components/world-clock";
import { FxBadge } from "@/components/fx-badge";
import { getUsdJpy } from "@/lib/fx";
import { MobileMenu } from "@/components/site/mobile-menu";
import { MobileSearch } from "@/components/site/mobile-search";
import { BottomNav } from "@/components/site/bottom-nav";
import { SwRegister } from "@/components/site/sw-register";
import { PushSettings } from "@/components/site/push-settings";
import { TawkChat } from "@/components/site/tawk-chat";
import { GoogleAnalytics } from "@/components/site/google-analytics";
import { ConsentProvider, CookieSettingsLink } from "@/components/site/consent";
import { FavoritesLink, FavoritesSync } from "@/components/site/favorite-button";
import { JsonLd } from "@/components/site/json-ld";
import { Logo, LOGO_SRC } from "@/components/brand/logo";
import { SocialLinks } from "@/components/site/social-links";
import { SAME_AS, SOCIAL } from "@/lib/social";
import { MARKETS } from "@/lib/markets";
import { Manrope } from "next/font/google";
import "./site.css";

// Public site face (the ERP keeps Plus Jakarta Sans); falls back to it and Noto Sans JP via site.css
// Desktop bar: these sit under "More". Makes, body types, offers and reviews are already on the home page and in the stock filters
const MORE = ["/offers", "/reviews", "/payment", "/blog"];
const FOOT_HEAD = "text-xs font-bold uppercase tracking-[0.18em] text-[var(--red-text)]";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-site", display: "swap" });

const OG_IMAGE = { url: "/brand/og.jpg?v=1", width: 1200, height: 630, alt: "Al Mashriq Trading — Japanese used cars, parts & machinery exported worldwide" };

export const metadata: Metadata = {
  title: { default: "Japanese used cars for export — Al Mashriq Trading", template: "%s | Al Mashriq Trading" },
  description:
    "Al Mashriq Trading Co., Ltd. exports quality Japanese used cars and spare parts worldwide. Browse our stock, get a C&F quotation by RoRo or container.",
  // Default share image (WhatsApp, Facebook, X, Google Discover); detail pages use their own photos.
  openGraph: { type: "website", siteName: "Al Mashriq Trading", locale: "en_US", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  // No site-wide canonical here: a page that forgot its own would point Google at the home page.
};

export const viewport: Viewport = { themeColor: "#10243a", width: "device-width", initialScale: 1 };

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [company, facets, makes, fx] = await Promise.all([getCompany(), getFacets(), getMakeTiles(), getUsdJpy()]);
  const wa = whatsapp(company, "Hello Al Mashriq, I'd like to know about your cars.");
  const topMakes = makes.slice(0, 24);

  const links = [
    { href: "/", label: "Home" },
    { href: "/cars", label: "Stock list" },
    { href: "/parts", label: "Parts" },
    { href: "/machinery", label: "Machinery" },
    { href: "/offers", label: "Offers" },
    { href: "/how-to-buy", label: "How to buy" },
    { href: "/payment", label: "Payment" },
    { href: "/reviews", label: "Reviews" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
    { href: "/account", label: "My account" },
  ];
  const navLink = "block whitespace-nowrap px-2 py-3 text-[13px] xl:px-4 xl:text-sm font-bold text-white/90 transition hover:bg-white/10 hover:text-white";
  // A logo uploaded in Settings wins; otherwise the built-in Al Mashriq mark + wordmark (crisp SVG, light text on the dark site).
  const custom = company.logo_url;
  // The original-colour logo (as on the login page), straight on the dark bars
  const logoPlate = "inline-block";
  const logoImg = (h: string) => (
    <span className="inline-block rounded-xl bg-white/95 px-2 py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={custom!} alt={company.company_name} className={`${h} w-auto object-contain`} />
    </span>
  );

  return (
    <ConsentProvider>
    <div className={`site-glass pb-nav ${manrope.variable}`}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          name: company.company_name,
          url: SITE_URL,
          logo: `${SITE_URL}${LOGO_SRC}`,
          email: company.email ?? undefined,
          telephone: company.phone ?? company.mobile ?? undefined,
          faxNumber: company.fax ?? undefined,
          "@id": `${SITE_URL}/#business`,
          address: company.address
            ? {
                "@type": "PostalAddress",
                streetAddress: company.address.replace(/\s*\r?\n\s*/g, ", "),
                postalCode: company.address.match(/\b\d{3}-\d{4}\b/)?.[0],
                addressCountry: "JP",
              }
            : undefined,
          hasMap: SOCIAL.googleMaps,
          areaServed: ["Worldwide", ...MARKETS.map((m) => m.name)],
          // Verified brand profiles and the Google Maps listing — tells Google these are one business.
          sameAs: SAME_AS,
        }}
      />

      {/* Desktop info strip (on phones this lives in the menu) */}
      <div className="on-dark on-dark-bar hidden border-b border-white/10 text-[12px] text-white/70 lg:block">
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
      {/* White logo row: the original logo (black lettering) reads on white; navy stays on the strip, menu and footer */}
      <header className="hidden border-b border-[var(--line)] bg-white lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <Link href="/" className="shrink-0 rounded-xl" aria-label={`${company.company_name} home`}>
            {custom ? logoImg("h-11") : <span className={logoPlate}><Logo tone="light" size="lg" /></span>}
          </Link>
          <form action="/cars" className="mx-auto w-full max-w-xl" role="search">
            <div className="glass flex overflow-hidden rounded-2xl focus-within:ring-2 focus-within:ring-[var(--focus)]">
              <input name="q" placeholder="Search make, model, stock ID…" className="w-full !rounded-none !border-0 bg-transparent px-4 py-2.5 text-sm" aria-label="Search cars" />
              <button className="inline-flex items-center gap-1.5 bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-brand-700">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </form>
          <div className="flex shrink-0 items-center gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-jet-950 hover:brightness-110">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
              <Send className="h-4 w-4" /> Inquiry
            </Link>
          </div>
        </div>
      </header>

      {/* Sticky bar: logo + search icon + favourites + menu on phones, the full navigation on desktop */}
      <nav className="site-nav on-dark glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center gap-2 px-3 lg:h-auto lg:px-4">
          <Link href="/" className="shrink-0 rounded-xl lg:hidden" aria-label="Al Mashriq Trading home">
            {custom ? (
              <span className="inline-block rounded-lg bg-white/95 px-1.5 py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={custom} alt="" className="h-8 w-auto object-contain" />
              </span>
            ) : (
              <span className={logoPlate}><Logo tone="light" size="sm" alt="" /></span>
            )}
          </Link>
          <ul className="hidden items-center lg:flex">
            {links.slice(0, 4).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={navLink}>
                  {l.label}
                </Link>
              </li>
            ))}
            {links.slice(4).filter((l) => !MORE.includes(l.href)).map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={navLink}>
                  {l.label}
                </Link>
              </li>
            ))}
            {/* Secondary pages folded into one menu so the bar stays short (phones list them all in the drawer) */}
            <li className="group relative">
              <button type="button" aria-haspopup="true" className={`${navLink} flex items-center gap-1`}>
                More <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div className="glass-strong invisible absolute right-0 top-full w-48 rounded-b-2xl p-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                {links.filter((l) => MORE.includes(l.href)).map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/10 hover:text-white">
                    {l.label}
                  </Link>
                ))}
              </div>
            </li>
          </ul>
          <MobileSearch />
          {/* Phones: one tap to sign in / the customer account (signed-out visitors are sent to /account/login) */}
          <Link href="/account" aria-label="My account" className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10 lg:hidden">
            <UserRound className="h-5 w-5" />
          </Link>
          <FavoritesLink className="text-white hover:bg-white/10 lg:ml-auto" />
          <MobileMenu
            links={links}
            makes={topMakes.map((m) => ({ href: `/makes/${m.slug}`, label: m.label, logo: m.logo }))}
            contact={{ email: company.email, phone: company.phone ?? company.mobile, address: company.address, wa }}
            fx={fx}
          />
        </div>
        <div className="hidden h-0.5 bg-gradient-to-r from-[var(--red)] via-brand-500/70 to-transparent lg:block" />
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer className="on-dark on-dark-bar mt-14 border-t border-white/10">
        {/* Desktop: four calm columns (brand · pages · markets · contact). Makes live in the Makes menu above.
            Phones get a slim footer (company, address, call/WhatsApp, legal row): the side menu already has the page links */}
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-10 gap-y-8 px-4 py-6 lg:grid-cols-[1.25fr_1fr_1.25fr_1.1fr] lg:px-6 lg:py-10">
          <div className="hidden lg:block">
            {custom ? logoImg("h-11") : <span className={logoPlate}><Logo tone="light" size="lg" /></span>}
            <p className="mt-3 max-w-[34ch] text-sm leading-6 text-white/70">{company.company_name} exports quality Japanese used vehicles and spare parts worldwide by RoRo and container.</p>
            <SocialLinks className="mt-4 text-white/85" />
          </div>
          <nav className="hidden lg:block" aria-label="Footer">
            <div className={FOOT_HEAD}>Explore</div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {links.slice(1).filter((l) => l.href !== "/account").map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-8 items-center text-white/70 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hidden lg:block">
            <div className={FOOT_HEAD}>
              <Link href="/export" className="hover:underline">
                We export to
              </Link>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {MARKETS.map((m) => (
                <li key={m.slug}>
                  <Link href={`/export/${m.slug}`} className="inline-flex min-h-8 items-center text-white/70 hover:text-white">
                    {m.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 space-y-1.5 text-sm text-white/75 lg:col-span-1">
            <div className={FOOT_HEAD}>
              <span className="lg:hidden">{company.company_name}</span>
              <span className="hidden lg:inline">Contact</span>
            </div>
            {company.address && (
              <div className="flex gap-2 pt-1.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--red-text)]" />
                <span className="whitespace-pre-line">{company.address}</span>
              </div>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`} className="flex min-h-11 items-center gap-2 hover:text-white lg:min-h-8">
                <Phone className="h-4 w-4 text-[var(--red-text)]" /> {company.phone}
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="hidden min-h-8 items-center gap-2 hover:text-white lg:flex">
                <Mail className="h-4 w-4 shrink-0 text-[var(--red-text)]" /> {company.email}
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener nofollow" className="!mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-4 font-bold text-jet-950 hover:brightness-110">
                <MessageCircle className="h-4 w-4" /> WhatsApp{company.mobile ? ` · ${company.mobile}` : ""}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 px-4 py-4 text-center text-xs text-white/60">
          <span>
            © {new Date().getFullYear()} {company.company_name}. All rights reserved.
          </span>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-8 items-center hover:text-white">
            Support: {SUPPORT_EMAIL}
          </a>
          <Link href="/verify-agent" className="inline-flex min-h-8 items-center hover:text-white">
            Verify an agent
          </Link>
          <Link href="/privacy" className="inline-flex min-h-8 items-center hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/cookies" className="inline-flex min-h-8 items-center hover:text-white">
            Cookie Policy
          </Link>
          <Link href="/terms" className="inline-flex min-h-8 items-center hover:text-white">
            Terms of Use
          </Link>
          <CookieSettingsLink className="inline-flex min-h-8 items-center underline hover:text-white" />
          <PushSettings compact />
        </div>
      </footer>

      <BottomNav wa={wa} />
      <SwRegister />
      <TawkChat />
      <GoogleAnalytics />
      <FavoritesSync />

      {/* Desktop-only WhatsApp bubble (phones have it in the bottom bar and the menu) */}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener nofollow"
          aria-label="WhatsApp"
          className="fixed bottom-5 right-5 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-jet-950 shadow-xl shadow-black/40 transition hover:scale-105 lg:flex"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
    </ConsentProvider>
  );
}
