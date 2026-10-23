import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, CircleCheck, CircleDashed, CircleDot, Ban } from "lucide-react";
import { verifyDocument, getCompany, whatsapp } from "@/lib/public-site";
import { money, date } from "@/lib/format";
import type { Currency } from "@/lib/types";

export const metadata: Metadata = { title: "Verify document", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TYPE = { invoice: "Invoice", quotation: "Quotation", auction_deposit: "Auction deposit invoice" } as const;

/** Opened by scanning the QR code printed on an invoice, quotation or auction deposit invoice. */
export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [doc, company] = await Promise.all([verifyDocument(token), getCompany()]);
  const wa = whatsapp(company, doc ? `Hello, I'd like to confirm document ${doc.invoice_no}.` : "Hello, I scanned a document QR code that could not be verified.");

  if (!doc) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="glass rounded-3xl p-6 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-3 text-2xl font-black">Not verified</h1>
          <p className="mt-2 text-sm text-white/70">
            This QR code does not match any document issued by {company.company_name}. The document may be altered or not genuine. Please do not make any payment and contact us to confirm.
          </p>
          <ContactButtons wa={wa} email={company.email} />
        </div>
      </div>
    );
  }

  const cur = doc.currency as Currency;
  const total = Number(doc.total);
  const paid = Number(doc.amount_paid);
  const balance = Math.max(0, total - paid);
  const isQuote = doc.doc_type === "quotation";
  const expired = isQuote && doc.valid_until != null && doc.valid_until < new Date().toISOString().slice(0, 10);

  const status =
    doc.status === "cancelled"
      ? { label: "Cancelled — not valid", icon: <Ban className="h-5 w-5" />, cls: "bg-red-50 text-red-800 ring-red-200" }
      : isQuote
        ? expired
          ? { label: "Quotation expired", icon: <CircleDashed className="h-5 w-5" />, cls: "bg-amber-50 text-amber-800 ring-amber-200" }
          : { label: "Valid quotation (no payment due)", icon: <CircleDot className="h-5 w-5" />, cls: "bg-cerulean-50 text-cerulean-800 ring-cerulean-200" }
        : doc.status === "paid"
          ? { label: "Paid in full", icon: <CircleCheck className="h-5 w-5" />, cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" }
          : doc.status === "partially_paid"
            ? { label: "Partly paid", icon: <CircleDot className="h-5 w-5" />, cls: "bg-amber-50 text-amber-800 ring-amber-200" }
            : { label: "Unpaid", icon: <CircleDashed className="h-5 w-5" />, cls: "bg-white/10 text-white ring-white/20" };

  const rows: [string, React.ReactNode][] = [
    ["Document", TYPE[doc.doc_type]],
    ["Number", <span key="n" className="font-mono">{doc.invoice_no}</span>],
    ["Issued", date(doc.issue_date, "en")],
    ...(doc.due_date ? ([["Due", date(doc.due_date, "en")]] as [string, string][]) : []),
    ...(doc.valid_until ? ([["Valid until", date(doc.valid_until, "en")]] as [string, string][]) : []),
    ...(doc.customer ? ([["Customer", doc.customer]] as [string, string][]) : []),
    ...(doc.units > 0 ? ([["Vehicles", String(doc.units)]] as [string, string][]) : []),
    ["Total", <b key="t">{money(total, cur, "en")}</b>],
    ...(!isQuote && doc.status !== "cancelled"
      ? ([
          ["Paid", money(paid, cur, "en")],
          ["Balance", <b key="b">{money(balance, cur, "en")}</b>],
        ] as [string, React.ReactNode][])
      : []),
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-11 w-11 shrink-0 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-black leading-tight">Genuine document</h1>
            <p className="text-sm text-white/70">Issued by {doc.company || company.company_name}</p>
          </div>
        </div>

        <div className={`mt-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-bold ring-1 ${status.cls}`}>
          {status.icon}
          {status.label}
        </div>

        <dl className="mt-5 divide-y divide-white/10 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-white/60">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 text-xs leading-5 text-white/60">
          Check that the number and total match your printed copy. If anything is different, the paper may have been changed — contact us before paying. Payments are only valid to the bank account printed on our invoices.
        </p>
        <ContactButtons wa={wa} email={company.email} />
      </div>
      <p className="mt-4 text-center text-xs text-white/50">
        <Link href="/" className="hover:text-white">
          {company.company_name}
        </Link>
      </p>
    </div>
  );
}

function ContactButtons({ wa, email }: { wa: string | null; email: string | null }) {
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-[#25D366] px-4 text-sm font-bold text-jet-950">
          WhatsApp us
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="glass-lite inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-bold hover:bg-white/15">
          Email us
        </a>
      )}
    </div>
  );
}
