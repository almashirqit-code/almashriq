import type { Metadata } from "next";
import { PrintButton } from "@/components/buttons";
import { StatementTable } from "@/components/statement-table";
import { requireActivePortal, getPortalStatement, getInvoiceLetterhead, ledgers, fmtDate } from "@/lib/portal";

export const metadata: Metadata = { title: "Statement of account", robots: { index: false, follow: false } };

/** Printable statement of account (A4), one ledger per currency. */
export default async function PrintAccountStatement() {
  const me = await requireActivePortal();
  const [statement, settings] = await Promise.all([getPortalStatement(), getInvoiceLetterhead()]);
  const byCurrency = ledgers(statement);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-100 py-8 text-slate-900 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end px-4">
        <PrintButton>Print / save as PDF</PrintButton>
      </div>
      <div className="mx-auto max-w-[210mm] bg-white p-10 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div>
            {settings?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt="" className="mb-2 h-12 w-auto object-contain" />
            )}
            <div className="text-lg font-black">{settings?.company_name ?? "Al Mashriq Trading Co., Ltd."}</div>
            <div className="whitespace-pre-line text-xs text-slate-600">{settings?.address}</div>
            <div className="text-xs text-slate-600">{[settings?.phone, settings?.email].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black uppercase tracking-wide">Statement of account</div>
            <div className="text-sm">Date: {fmtDate(today)}</div>
          </div>
        </div>
        <div className="mt-4 text-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Customer</div>
          <div className="font-bold">{me.customer?.name}</div>
          {me.customer?.company && <div>{me.customer.company}</div>}
          <div className="text-slate-600">
            Customer no. {me.customer?.customer_no}
            {me.customer?.country ? ` · ${me.customer.country}` : ""}
          </div>
        </div>
        {byCurrency.size === 0 ? (
          <p className="mt-8 text-sm text-slate-600">Nothing on this statement yet.</p>
        ) : (
          [...byCurrency.entries()].map(([cur, rows]) => (
            <div key={cur} className="mt-6 break-inside-avoid">
              <h2 className="mb-1 text-base font-black">{cur}</h2>
              <StatementTable currency={cur} rows={rows} />
            </div>
          ))
        )}
        <p className="mt-8 text-xs text-slate-500">Quotations are not included. Please contact your sales agent if anything on this statement looks wrong.</p>
      </div>
    </div>
  );
}
