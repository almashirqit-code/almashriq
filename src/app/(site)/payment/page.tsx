import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, ShieldAlert, Phone, MessageCircle, FileText } from "lucide-react";
import { getBank, getCompany, whatsapp } from "@/lib/public-site";
import { CopyButton } from "@/components/site/copy-button";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Payment & bank details",
  description: "How to pay Al Mashriq Trading by bank transfer (TT): our bank account in Japan, SWIFT code and intermediary bank.",
  alternates: { canonical: "/payment" },
};

export default async function PaymentPage() {
  const [bank, company] = await Promise.all([getBank(), getCompany()]);
  const wa = whatsapp(company, "Hello, I'd like to confirm your bank details before I send payment.");
  const phone = company.phone || company.mobile;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <h1 className="border-l-4 border-brand-600 pl-3 text-3xl font-black text-navy-950">Payment & bank details</h1>
      <p className="mt-1 pl-4 text-slate-500">We accept payment by bank transfer (TT) to our company account in Japan.</p>

      <div className="mt-6 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <b>Protect your payment.</b> The account holder is always <b>{company.company_name}</b>. We never change our bank account by email or chat. If you receive
          different bank details, do not pay — call us first{phone ? ` on ${phone}` : ""} to confirm.
        </div>
      </div>

      {bank ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {bank.bank_details && <BankCard title="Our bank account (Japan)" text={bank.bank_details} primary />}
          {bank.intermediary_bank && <BankCard title="Intermediary bank (USA)" note="Only if your bank asks for an intermediary / correspondent bank for USD transfers." text={bank.intermediary_bank} />}
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-white p-8 text-center text-slate-600 ring-1 ring-slate-200">
          Our bank details are sent with your proforma invoice. <Link href="/contact" className="font-semibold text-brand-700">Contact us</Link> to request one.
        </div>
      )}

      <h2 className="mt-10 border-l-4 border-brand-600 pl-3 text-2xl font-black text-navy-950">How to pay</h2>
      <ol className="mt-4 space-y-3">
        {[
          "Reserve the car and receive our proforma invoice in your name (or your consignee's).",
          "Send the invoice amount by TT. Write the invoice number in the payment reference / message.",
          "Email or WhatsApp us a copy of the bank remittance slip (TT copy) so we can track the payment.",
          "We confirm when the money arrives and book shipping. Bank charges on your side are paid by the sender.",
        ].map((s, i) => (
          <li key={i} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-800 font-black text-white">{i + 1}</span>
            <p className="pt-1 text-slate-700">{s}</p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-bold text-white hover:bg-emerald-600">
            <MessageCircle className="h-4 w-4" /> Confirm details on WhatsApp
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-3 font-bold text-white hover:bg-navy-900">
            <Phone className="h-4 w-4" /> Call {phone}
          </a>
        )}
        <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 font-bold text-white hover:bg-brand-700">
          <FileText className="h-4 w-4" /> Request a proforma invoice
        </Link>
      </div>
    </div>
  );
}

function BankCard({ title, text, note, primary = false }: { title: string; text: string; note?: string; primary?: boolean }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <section className={`overflow-hidden rounded-xl bg-white shadow-sm ring-1 ${primary ? "ring-navy-300" : "ring-slate-200"}`}>
      <div className={`flex items-center justify-between gap-3 px-5 py-3 ${primary ? "bg-navy-800 text-white" : "bg-slate-50 text-navy-900"}`}>
        <h2 className="flex items-center gap-2 font-extrabold">
          <Landmark className="h-4 w-4" /> {title}
        </h2>
        <CopyButton text={text} label="Copy all" />
      </div>
      {note && <p className="px-5 pt-3 text-xs text-slate-500">{note}</p>}
      <dl className="divide-y divide-slate-100 px-5 py-2 text-sm">
        {lines.map((l, i) => {
          const m = l.match(/^([^:]{2,40}):\s*(.+)$/);
          return m ? (
            <div key={i} className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">{m[1]}</dt>
              <dd className="text-right font-semibold text-slate-900 [overflow-wrap:anywhere]">{m[2]}</dd>
            </div>
          ) : (
            <div key={i} className="py-2 font-semibold text-slate-900">
              {l}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
