import { translate, type DictKey, type Locale } from "@/lib/i18n/dictionaries";
import { money, date } from "@/lib/format";
import type { Customer, Invoice, InvoiceItem, Settings } from "@/lib/types";

/** The invoice as the customer sees it — used on the detail page and the print view. */
export function InvoiceDocument({
  invoice,
  items,
  customer,
  settings,
  lang,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer | null;
  settings: Settings | null;
  lang: Locale;
}) {
  const t = (k: DictKey) => translate(lang, k);
  const cur = invoice.currency;
  const company = (lang === "ja" && settings?.company_name_ja) || settings?.company_name || "Al Mashriq";
  const balance = Number(invoice.total) - Number(invoice.amount_paid);

  return (
    <div className="bg-white p-8 text-[13px] leading-relaxed text-slate-800 print:p-0">
      <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
        <div className="flex items-start gap-4">
          {settings?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt="" className="h-16 w-auto object-contain" />
          )}
          <div>
            <div className="text-lg font-bold text-slate-900">{company}</div>
            {lang === "ja" && settings?.company_name_ja && settings.company_name && (
              <div className="text-xs text-slate-500">{settings.company_name}</div>
            )}
            {settings?.address && <div className="whitespace-pre-line text-xs text-slate-600">{settings.address}</div>}
            <div className="text-xs text-slate-600">
              {[settings?.phone, settings?.email, settings?.website].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-wide text-slate-900">{t("inv_invoice")}</div>
          <div className="mt-1 font-mono text-sm">{invoice.invoice_no}</div>
          {invoice.status === "cancelled" && (
            <div className="mt-1 inline-block rounded border border-red-500 px-2 text-xs font-bold uppercase text-red-600">
              {t("is_cancelled")}
            </div>
          )}
          {invoice.status === "paid" && (
            <div className="mt-1 inline-block rounded border border-emerald-600 px-2 text-xs font-bold uppercase text-emerald-700">
              {t("is_paid")}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 py-5">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("inv_bill_to")}</div>
          {customer && (
            <>
              <div className="font-semibold text-slate-900">{customer.name}</div>
              {customer.company && <div>{customer.company}</div>}
              {customer.address && <div className="whitespace-pre-line text-xs">{customer.address}</div>}
              {customer.country && <div className="text-xs">{customer.country}</div>}
              <div className="text-xs text-slate-600">{[customer.phone, customer.email].filter(Boolean).join(" · ")}</div>
            </>
          )}
        </div>
        <table className="ml-auto text-xs">
          <tbody>
            {(
              [
                ["inv_issue_date", date(invoice.issue_date, lang)],
                ["inv_due_date", date(invoice.due_date, lang)],
                ["inv_currency", cur],
                ["inv_incoterm", invoice.incoterm],
                ["inv_pol", invoice.port_of_loading],
                ["inv_pod", invoice.port_of_discharge],
              ] as [DictKey, string | null][]
            )
              .filter(([, v]) => v && v !== "—")
              .map(([k, v]) => (
                <tr key={k}>
                  <td className="pr-4 py-0.5 text-slate-500">{t(k)}</td>
                  <td className="py-0.5 text-right font-medium">{v}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {(invoice.consignee_name || invoice.consignee_address || invoice.notify_party) && (
        <div className="mb-5 grid grid-cols-2 gap-6 rounded border border-slate-200 p-3 text-xs">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("inv_consignee")}</div>
            {invoice.consignee_name && <div className="font-semibold text-slate-900">{invoice.consignee_name}</div>}
            {invoice.consignee_address && <div className="whitespace-pre-line">{invoice.consignee_address}</div>}
            {invoice.consignee_phone && <div className="text-slate-600">{invoice.consignee_phone}</div>}
          </div>
          {invoice.notify_party && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("c_notify_party")}</div>
              <div className="whitespace-pre-line">{invoice.notify_party}</div>
            </div>
          )}
        </div>
      )}

      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="w-8 px-2 py-2 text-left font-semibold">#</th>
            <th className="px-2 py-2 text-left font-semibold">{t("inv_description")}</th>
            <th className="w-14 px-2 py-2 text-right font-semibold">{t("inv_qty")}</th>
            <th className="w-32 px-2 py-2 text-right font-semibold">{t("inv_unit_price")}</th>
            <th className="w-32 px-2 py-2 text-right font-semibold">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id} className="border-b border-slate-200 align-top">
              <td className="px-2 py-2 text-slate-500">{i + 1}</td>
              <td className="whitespace-pre-line px-2 py-2">{it.description}</td>
              <td className="px-2 py-2 text-right tabular-nums">{Number(it.quantity)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{money(it.unit_price, cur, lang)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{money(it.amount, cur, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <table className="w-72 text-sm">
          <tbody>
            <tr>
              <td className="py-1 text-slate-600">{t("inv_subtotal")}</td>
              <td className="py-1 text-right tabular-nums">{money(invoice.subtotal, cur, lang)}</td>
            </tr>
            {Number(invoice.discount) > 0 && (
              <tr>
                <td className="py-1 text-slate-600">{t("inv_discount")}</td>
                <td className="py-1 text-right tabular-nums">− {money(invoice.discount, cur, lang)}</td>
              </tr>
            )}
            {Number(invoice.tax) > 0 && (
              <tr>
                <td className="py-1 text-slate-600">
                  {t("inv_tax")} ({Number(invoice.tax_rate)}%)
                </td>
                <td className="py-1 text-right tabular-nums">{money(invoice.tax, cur, lang)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-slate-900 text-base font-bold">
              <td className="py-2">{t("inv_total")}</td>
              <td className="py-2 text-right tabular-nums">{money(invoice.total, cur, lang)}</td>
            </tr>
            {Number(invoice.amount_paid) > 0 && (
              <>
                <tr>
                  <td className="py-1 text-slate-600">{t("inv_paid")}</td>
                  <td className="py-1 text-right tabular-nums">{money(invoice.amount_paid, cur, lang)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-1">{t("inv_balance")}</td>
                  <td className="py-1 text-right tabular-nums">{money(balance, cur, lang)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 text-xs">
        {settings?.bank_details && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("inv_bank")}</div>
            <div className="whitespace-pre-line">{settings.bank_details}</div>
          </div>
        )}
        <div>
          {invoice.notes && (
            <>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("notes")}</div>
              <div className="mb-3 whitespace-pre-line">{invoice.notes}</div>
            </>
          )}
          {settings?.invoice_terms && (
            <>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("inv_terms")}</div>
              <div className="whitespace-pre-line">{settings.invoice_terms}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
