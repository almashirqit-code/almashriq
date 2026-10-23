import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { money } from "@/lib/format";
import { requireActivePortal, getPortalInvoiceDoc, DOC_TYPE_LABEL, INVOICE_STATUS, fmtDate } from "@/lib/portal";
import { Card, Pill, Field } from "../../ui";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

export default async function AccountInvoice({ params }: { params: Promise<{ id: string }> }) {
  await requireActivePortal();
  const { id } = await params;
  const doc = await getPortalInvoiceDoc(id);
  if (!doc) notFound();
  const { invoice: inv, items } = doc;
  const type = DOC_TYPE_LABEL[inv.doc_type as keyof typeof DOC_TYPE_LABEL] ?? "Invoice";
  const quote = inv.doc_type === "quotation";
  const status = INVOICE_STATUS[inv.status as keyof typeof INVOICE_STATUS];
  const balance = Number(inv.total) - Number(inv.amount_paid);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/account/invoices" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> All invoices
        </Link>
        <a
          href={`/account/print/invoices/${inv.id}`}
          target="_blank"
          rel="noopener"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-brand-700"
        >
          <Printer className="h-4 w-4" /> Print / save as PDF
        </a>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">{type}</div>
            <h2 className="text-2xl font-black">{inv.invoice_no}</h2>
          </div>
          {quote ? <Pill cls="bg-violet-100 text-violet-900">Quotation</Pill> : status && <Pill cls={status.cls}>{status.label}</Pill>}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Issued">{fmtDate(inv.issue_date)}</Field>
          <Field label={quote ? "Valid until" : "Due"}>{fmtDate(quote ? inv.valid_until : inv.due_date)}</Field>
          <Field label="Terms">{inv.incoterm}</Field>
          <Field label="Destination">{inv.port_of_discharge}</Field>
        </dl>
      </Card>

      <Card className="mt-3 overflow-x-auto p-0">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-white/60">
              <th className="px-5 py-3">Item</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-current/10">
                <td className="px-5 py-3">
                  <div className="font-semibold">
                    {it.vehicles ? [it.vehicles.year, it.vehicles.make, it.vehicles.model, it.vehicles.grade].filter(Boolean).join(" ") : it.description}
                  </div>
                  {it.vehicles && (
                    <div className="text-xs text-white/70">
                      {[it.vehicles.stock_no, it.vehicles.chassis_no && `Chassis ${it.vehicles.chassis_no}`].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {it.vehicles && it.description && <div className="text-xs text-white/70">{it.description}</div>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{Number(it.quantity)}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums">{money(it.amount, inv.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-current/20">
            <tr>
              <td className="px-5 py-3 font-bold" colSpan={2}>
                Total
              </td>
              <td className="px-5 py-3 text-right text-lg font-black tabular-nums">{money(inv.total, inv.currency)}</td>
            </tr>
            {!quote && (
              <>
                <tr>
                  <td className="px-5 pb-1 text-white/70" colSpan={2}>
                    Paid
                  </td>
                  <td className="px-5 pb-1 text-right tabular-nums text-emerald-700">{money(inv.amount_paid, inv.currency)}</td>
                </tr>
                <tr>
                  <td className="px-5 pb-4 font-bold" colSpan={2}>
                    Balance
                  </td>
                  <td className={`px-5 pb-4 text-right font-black tabular-nums ${balance > 0.005 && inv.status !== "cancelled" ? "text-brand-700" : ""}`}>
                    {money(inv.status === "cancelled" ? 0 : balance, inv.currency)}
                  </td>
                </tr>
              </>
            )}
          </tfoot>
        </table>
      </Card>
      <p className="mt-3 text-xs text-white/60">The printed version carries a QR code anyone can scan to confirm the document is genuine.</p>
    </>
  );
}
