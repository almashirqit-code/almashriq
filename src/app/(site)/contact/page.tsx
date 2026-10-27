import type { Metadata } from "next";
import { Mail, Phone, MapPin, MessageCircle, Printer, Clock } from "lucide-react";
import { getCompany, whatsapp, SUPPORT_EMAIL } from "@/lib/public-site";
import { InquiryForm } from "@/components/site/inquiry-form";
import { WorldClock } from "@/components/world-clock";
import { SocialLinks } from "@/components/site/social-links";
import { YardMap } from "@/components/site/yard-map";
import { mapsQuery } from "@/lib/social";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact us — send an inquiry",
  description: "Contact Al Mashriq Trading for a C&F quotation, a car you want sourced from Japanese auctions, or spare parts. We reply within 24 hours.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ stock?: string }> }) {
  const [{ stock }, company] = await Promise.all([searchParams, getCompany()]);
  const wa = whatsapp(company, "Hello Al Mashriq, ");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">Contact us</h1>
      <p className="mt-1 pl-4 text-slate-500">Send us the car you want, your budget and destination port — we reply with a full quotation.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-black text-navy-950">Send an inquiry</h2>
          <InquiryForm source="contact" stockNo={stock} defaultMessage={stock ? `I'm interested in ${stock}.` : ""} />
        </div>
        <aside className="space-y-4">
          <div className="space-y-3 rounded-xl bg-navy-900 p-6 text-sm text-navy-100">
            <div className="text-lg font-black text-white">{company.company_name}</div>
            {company.address && (
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span className="whitespace-pre-line">{company.address}</span>
              </div>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`} className="flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4 text-brand-600" /> {company.phone}
              </a>
            )}
            {company.fax && (
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-brand-600" /> Fax {company.fax}
              </div>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="flex items-center gap-2 break-all hover:text-white">
                <Mail className="h-4 w-4 shrink-0 text-brand-600" /> Sales: {company.email}
              </a>
            )}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 break-all hover:text-white">
              <Mail className="h-4 w-4 shrink-0 text-brand-600" /> Support: {SUPPORT_EMAIL}
            </a>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-600" /> <WorldClock zones={["japan"]} />
            </div>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 font-bold text-jet-950 hover:brightness-110">
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
              </a>
            )}
            <div className="border-t border-white/10 pt-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">Follow us</div>
              <SocialLinks className="text-white" />
            </div>
          </div>
          <YardMap query={mapsQuery(company.company_name, company.address)} />
        </aside>
      </div>
    </div>
  );
}
