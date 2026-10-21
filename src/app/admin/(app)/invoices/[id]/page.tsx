import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Printer, Gavel, Send, Ban, Trash2, X, ArrowRightLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, date } from "@/lib/format";
import { DOC_LIST_PATH, type Customer, type DocType, type Invoice, type Payment, type Settings } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, InvoiceStatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/buttons";
import { InvoiceDocument, INVOICE_ITEM_SELECT, type InvoiceItemWithVehicle } from "@/components/invoice-document";
import { issueInvoice, cancelInvoice, deleteInvoice, addPayment, deletePayment, convertQuotationAndOpen } from "../actions";
import { DocTabs } from "../doc-list";
import { verifyQrSvg } from "@/lib/verify-qr";
import { PaymentForm } from "./payment-form";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const invoice = inv as Invoice;

  const [{ data: items }, { data: payments }, { data: customer }, { data: settings }] = await Promise.all([
    supabase.from("invoice_items").select(INVOICE_ITEM_SELECT).eq("invoice_id", id).order("sort_order"),
    supabase.from("payments").select("*").eq("invoice_id", id).order("paid_on"),
    supabase.from("customers").select("*").eq("id", invoice.customer_id).maybeSingle(),
    supabase.from("settings").select("*").single(),
  ]);

  const balance = Number(invoice.total) - Number(invoice.amount_paid);
  const live = invoice.status !== "draft" && invoice.status !== "cancelled";
  const docType: DocType = invoice.doc_type ?? "invoice";
  const isQuote = docType === "quotation";

  // Quotation ↔ invoice links.
  const [{ data: convertedTo }, { data: fromQuote }] = await Promise.all([
    isQuote
      ? supabase.from("invoices").select("id, invoice_no").eq("converted_from", id).neq("status", "cancelled").limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    invoice.converted_from
      ? supabase.from("invoices").select("id, invoice_no").eq("id", invoice.converted_from).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const qr = invoice.status === "draft" ? null : await verifyQrSvg(invoice.verify_token);
  const issueLabel =t(docType === "invoice" ? "inv_mark_issued" : (`doc_issue_${docType}` as DictKey));

  return (
    <>
      <PageHeader
        back={{ href: DOC_LIST_PATH[docType], label: t(`doc_${docType}` as DictKey) }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {invoice.invoice_no}
            <InvoiceStatusBadge status={invoice.status} label={t(`is_${invoice.status}` as DictKey)} />
          </span>
        }
        subtitle={(customer as Customer | null)?.name}
        actions={
          <>
            {invoice.status === "draft" && (
              <>
                <Link href={`/admin/invoices/${id}/edit`} className="btn-secondary">
                  <Pencil className="h-4 w-4" />
                  {t("edit")}
                </Link>
                <ConfirmButton action={issueInvoice.bind(null, id)} className="btn-primary" message={`${issueLabel}?`}>
                  <Send className="h-4 w-4" />
                  {issueLabel}
                </ConfirmButton>
              </>
            )}
            {isQuote && invoice.status !== "cancelled" && !convertedTo && (
              <ConfirmButton action={convertQuotationAndOpen.bind(null, id)} className="btn-primary" message={`${t("doc_convert")}?`}>
                <ArrowRightLeft className="h-4 w-4" />
                {t("doc_convert")}
              </ConfirmButton>
            )}
            <a href={`/admin/print/invoices/${id}?lang=en`} target="_blank" className="btn-secondary">
              <Printer className="h-4 w-4" />
              {t("print")} EN
            </a>
            <a href={`/admin/print/invoices/${id}?lang=ja`} target="_blank" className="btn-secondary">
              <Printer className="h-4 w-4" />
              {t("print")} 日本語
            </a>
            {can.seeCost(profile.role) && !isQuote && (
              <a href={`/admin/print/auction?invoice=${id}`} target="_blank" className="btn-secondary">
                <Gavel className="h-4 w-4" />
                Auction breakdown
              </a>
            )}
            {can.deleteRecords(profile.role) && invoice.status !== "cancelled" && invoice.status !== "draft" && (
              <ConfirmButton action={cancelInvoice.bind(null, id)} message={`${t("inv_cancel_invoice")}?`}>
                <Ban className="h-4 w-4" />
                {t("inv_cancel_invoice")}
              </ConfirmButton>
            )}
            {can.deleteRecords(profile.role) && (invoice.status === "draft" || invoice.status === "cancelled") && (
              <ConfirmButton action={deleteInvoice.bind(null, id)}>
                <Trash2 className="h-4 w-4" />
                {t("delete")}
              </ConfirmButton>
            )}
          </>
        }
      />

      <DocTabs active={docType} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <InvoiceDocument
            invoice={invoice}
            items={(items ?? []) as unknown as InvoiceItemWithVehicle[]}
            customer={customer as Customer | null}
            settings={settings as Settings | null}
            lang={locale}
            qr={qr}
          />
        </div>

        <div className="space-y-5">
          {(convertedTo || fromQuote) && (
            <section className="card px-5 py-4 text-sm">
              {convertedTo && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{t("doc_converted_to")}</span>
                  <Link href={`/admin/invoices/${convertedTo.id}`} className="font-semibold text-cerulean-700 hover:underline">
                    {convertedTo.invoice_no}
                  </Link>
                </div>
              )}
              {fromQuote && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{t("doc_converted_from")}</span>
                  <Link href={`/admin/invoices/${fromQuote.id}`} className="font-semibold text-cerulean-700 hover:underline">
                    {fromQuote.invoice_no}
                  </Link>
                </div>
              )}
            </section>
          )}
          {isQuote ? (
            <section className="card px-5 py-4 text-sm text-slate-600">{t("doc_quotation_help")}</section>
          ) : (
          <section className="card">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-semibold">{t("inv_payments")}</h2>
            </div>
            <div className="space-y-1.5 px-5 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t("inv_total")}</span>
                <span className="tabular-nums">{money(invoice.total, invoice.currency, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("inv_paid")}</span>
                <span className="tabular-nums text-emerald-700">{money(invoice.amount_paid, invoice.currency, locale)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold">
                <span>{t("inv_balance")}</span>
                <span className={`tabular-nums ${balance > 0 ? "text-red-600" : ""}`}>{money(balance, invoice.currency, locale)}</span>
              </div>
              {invoice.currency !== "JPY" && (
                <div className="text-right text-xs text-slate-400">
                  1 {invoice.currency} = {Number(invoice.exchange_rate)} JPY
                </div>
              )}
            </div>
            {(payments ?? []).length > 0 && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {((payments ?? []) as Payment[]).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <div>
                      <div className="font-medium tabular-nums">{money(p.amount, invoice.currency, locale)}</div>
                      <div className="text-xs text-slate-500">
                        {date(p.paid_on, locale)} · {p.method}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </div>
                    </div>
                    {can.deleteRecords(profile.role) && (
                      <ConfirmButton action={deletePayment.bind(null, p.id, id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </ConfirmButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {live && balance > 0 && <PaymentForm action={addPayment.bind(null, id)} balance={balance} />}
          </section>
          )}
        </div>
      </div>
    </>
  );
}
