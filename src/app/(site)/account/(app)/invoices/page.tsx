import type { Metadata } from "next";
import Link from "next/link";
import { money } from "@/lib/format";
import { requireActivePortal, getPortalInvoices, DOC_TYPE_LABEL, INVOICE_STATUS, fmtDate } from "@/lib/portal";
import { Pill, EmptyNote } from "../ui";

export const metadata: Metadata = { title: "My invoices", robots: { index: false, follow: false } };

export default async function AccountInvoices() {
  await requireActivePortal();
  const invoices = await getPortalInvoices();
  if (!invoices.length) return <EmptyNote>No invoices yet. Your invoices and quotations will appear here as soon as your agent issues them.</EmptyNote>;

  return (
    <div className="grid gap-2">
      {invoices.map((i) => {
        const balance = Number(i.total) - Number(i.amount_paid);
        const quote = i.doc_type === "quotation";
        return (
          <Link
            key={i.id}
            href={`/account/invoices/${i.id}`}
            className="glass grid grid-cols-2 items-center gap-x-4 gap-y-1 rounded-2xl px-5 py-4 hover:brightness-105 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <div className="min-w-0">
              <div className="font-bold">{i.invoice_no}</div>
              <div className="text-xs text-white/70">
                {DOC_TYPE_LABEL[i.doc_type]} · {fmtDate(i.issue_date)}
                {quote && i.valid_until ? ` · valid until ${fmtDate(i.valid_until)}` : !quote && i.due_date ? ` · due ${fmtDate(i.due_date)}` : ""}
                {i.units ? ` · ${i.units} ${i.units === 1 ? "car" : "cars"}` : ""}
              </div>
            </div>
            <div className="text-right font-bold tabular-nums sm:text-left">{money(i.total, i.currency)}</div>
            <div className="text-sm tabular-nums text-white/70">
              {!quote && i.status !== "cancelled" && balance > 0.005 ? `Balance ${money(balance, i.currency)}` : ""}
            </div>
            <div className="text-right">
              {quote ? <Pill cls="bg-violet-100 text-violet-900">Quotation</Pill> : <Pill cls={INVOICE_STATUS[i.status].cls}>{INVOICE_STATUS[i.status].label}</Pill>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
