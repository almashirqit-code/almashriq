import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getCompany, whatsapp } from "@/lib/public-site";
import { VerifyForm } from "./verify-form";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Verify an agent — is this really Al Mashriq?",
  description: "Check whether a phone number, WhatsApp number or email that contacted you really belongs to Al Mashriq Trading staff before you pay.",
  alternates: { canonical: "/verify-agent" },
};

/** Public anti-scam check: anyone types the contact that reached them; no sign-in needed (migration 0033). */
export default async function VerifyAgentPage() {
  const company = await getCompany();
  const wa = whatsapp(company, "Hello, someone contacted me saying they are from Al Mashriq. Can you confirm?");
  const contact = (
    <div className="mt-4 flex flex-wrap gap-2">
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-[#25D366] px-4 text-sm font-bold text-jet-950">
          WhatsApp us{company.mobile ? ` · ${company.mobile}` : ""}
        </a>
      )}
      {company.email && (
        <a href={`mailto:${company.email}`} className="inline-flex min-h-11 items-center break-all rounded-xl bg-white px-4 text-sm font-bold text-slate-900 ring-1 ring-slate-200">
          {company.email}
        </a>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-11 w-11 shrink-0 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-black leading-tight">Verify an agent</h1>
            <p className="text-sm text-white/70">Did someone contact you saying they are from {company.company_name}? Check before you pay.</p>
          </div>
        </div>
        <p className="mb-4 mt-5 text-sm text-white/80">Type the phone number, WhatsApp number or email address that contacted you. No sign-in needed.</p>
        <VerifyForm contact={contact} />
        <ul className="mt-6 space-y-1.5 text-xs leading-5 text-white/60">
          <li>• We only accept payment into the company bank account printed on our invoices.</li>
          <li>• Every invoice has a QR code — scan it to check the invoice is genuine.</li>
          <li>• Our staff never ask you to pay into a personal account or change bank details by message.</li>
        </ul>
      </div>
    </div>
  );
}
