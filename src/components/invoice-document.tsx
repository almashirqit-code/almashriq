import { translate, type DictKey, type Locale } from "@/lib/i18n/dictionaries";
import { money, date, num } from "@/lib/format";
import { amountInWords } from "@/lib/words";
import { INCOTERM_LABEL, hasFreight, hasInsurance, type Customer, type Invoice, type InvoiceItem, type Settings } from "@/lib/types";
import { LOGO_SRC } from "@/components/brand/logo";

export type InvoiceItemWithVehicle = InvoiceItem & {
  vehicles?: {
    stock_no: string;
    make: string;
    model: string;
    grade: string | null;
    chassis_no: string | null;
    engine_cc: number | null;
    color: string | null;
    year: number | null;
  } | null;
};

/** Item select string that brings the vehicle columns the invoice prints. */
export const INVOICE_ITEM_SELECT = "*, vehicles(stock_no, make, model, grade, chassis_no, engine_cc, color, year)";

const BRAND_RED = "#d71920"; // logo red

/** The invoice as the customer sees it — detail page and print view. A4 portrait. */
export function InvoiceDocument({
  invoice,
  items,
  customer,
  settings,
  lang,
  qr,
}: {
  invoice: Invoice;
  items: InvoiceItemWithVehicle[];
  customer: Customer | null;
  settings: Settings | null;
  lang: Locale;
  /** QR code SVG markup for the public verify link (lib/verify-qr). */
  qr?: string | null;
}) {
  const t = (k: DictKey) => translate(lang, k);
  const cur = invoice.currency;
  const term = INCOTERM_LABEL[invoice.incoterm ?? "FOB"] ?? invoice.incoterm ?? "FOB";
  const company = settings?.company_name || "AL MASHRIQ TRADING CO., LTD.";
  const companyJa = settings?.company_name_ja;
  const logo = settings?.logo_url || LOGO_SRC;
  const stamp = settings?.stamp_url || "/brand/stamp.png";
  const freight = Number(invoice.freight ?? 0);
  const insurance = Number(invoice.insurance ?? 0);
  const discount = Number(invoice.discount ?? 0);
  const paid = Number(invoice.amount_paid);
  const balance = Number(invoice.total) - paid;
  const units = items.reduce((s, it) => s + (it.vehicle_id ? Number(it.quantity) : 0), 0);
  const shipment = invoice.shipment_type ? t(`ship_${invoice.shipment_type}` as DictKey) : null;
  const docType = invoice.doc_type ?? "invoice";
  // Separate freight/insurance lines only when they carry an amount; otherwise (e.g. RoRo with freight in the car price)
  // the customer sees just the item prices and one total.
  const splitTotals = freight > 0 || insurance > 0;
  // Container loads (up to ~6 cars in a 40ft): tighter rows so the whole invoice prints on one A4 page.
  const dense = items.length > 3;
  const cell = dense ? "px-2 py-1 leading-tight" : "px-2 py-2";
  const gap = dense ? "mt-2.5" : "mt-4"; // space between sections
  const gap2 = dense ? "mt-2" : "mt-3";

  const contact = [
    settings?.phone && `Tel: ${settings.phone}`,
    settings?.fax && `Fax: ${settings.fax}`,
    settings?.mobile && `Mob: ${settings.mobile}`,
  ].filter(Boolean);

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: BRAND_RED }}>
      {children}
    </div>
  );

  return (
    <div className="relative overflow-hidden bg-white px-10 py-8 text-[12px] leading-snug text-slate-800 print:px-0 print:py-0">
      {/* Watermark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52%] w-[70%] -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] select-none opacity-[0.045]"
      />

      <div className="relative">
        {/* Header */}
        <header className="flex items-start justify-between gap-6 leading-normal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={company} className={`${dense ? "h-[60px]" : "h-[76px]"} w-auto object-contain`} />
          <div className="text-right">
            <div className="text-[15px] font-extrabold uppercase tracking-wide text-slate-900">{company}</div>
            {companyJa && <div className="text-[11px] text-slate-500">{companyJa}</div>}
            {settings?.address && <div className="mt-1 whitespace-pre-line text-[11px] text-slate-600">{settings.address}</div>}
            {contact.length > 0 && <div className="text-[11px] text-slate-600">{contact.join("  ·  ")}</div>}
            {(settings?.email || settings?.website) && (
              <div className="text-[11px] text-slate-600">{[settings?.email, settings?.website].filter(Boolean).join("  ·  ")}</div>
            )}
          </div>
        </header>

        <div className={`${gap} flex h-[5px] overflow-hidden rounded-full`}>
          <div className="w-2/3" style={{ background: BRAND_RED }} />
          <div className="w-1/3 bg-slate-900" />
        </div>

        {/* Title + meta */}
        <div className={`${gap} flex items-end justify-between gap-6`}>
          <div>
            <h1 className={`${docType === "auction_deposit" ? "text-[24px]" : "text-[30px]"} font-black leading-none tracking-tight text-slate-900`}>{t(`doc_title_${docType}` as DictKey)}</h1>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {term} {shipment ? `· ${shipment}` : ""}
            </div>
          </div>
          <table className="text-[11.5px]">
            <tbody>
              {(
                [
                  [t(`doc_no_${docType}` as DictKey), `# ${invoice.invoice_no}`],
                  [t("inv_issue_date"), date(invoice.issue_date, lang)],
                  [t("inv_due_date"), invoice.due_date ? date(invoice.due_date, lang) : null],
                  [t("doc_valid_until"), invoice.valid_until ? date(invoice.valid_until, lang) : null],
                  [t("inv_page"), "1"],
                ] as [string, string | null][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <tr key={k}>
                    <td className="pr-4 text-right text-slate-500">{k}</td>
                    <td className="text-right font-bold text-slate-900">{v}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {(invoice.status === "paid" || invoice.status === "cancelled") && (
          <div
            className={`absolute right-24 top-40 -rotate-12 rounded-md border-[3px] px-4 py-1 text-xl font-black uppercase tracking-widest opacity-80 ${
              invoice.status === "paid" ? "border-emerald-600 text-emerald-600" : "border-red-600 text-red-600"
            }`}
          >
            {t(`is_${invoice.status}` as DictKey)}
          </div>
        )}

        {/* Parties + shipment */}
        <div className={`${gap} grid gap-3 ${invoice.show_consignee ? "grid-cols-3" : "grid-cols-2"}`}>
          <section className={`rounded-lg border border-slate-200 bg-white/80 px-3 ${dense ? "py-2" : "py-2.5"}`}>
            <Label>{t("inv_bill_to")}</Label>
            {customer && (
              <>
                <div className="text-[13px] font-bold uppercase text-slate-900">{customer.name}</div>
                {customer.company && <div>{customer.company}</div>}
                {(customer.address || customer.country) && (
                  <div className="whitespace-pre-line text-[11.5px] text-slate-600">
                    {[customer.address, customer.country].filter(Boolean).join("\n")}
                  </div>
                )}
                {(customer.phone || customer.whatsapp || customer.email) && (
                  <div className="mt-1 text-[11.5px] text-slate-600">
                    {[customer.phone || customer.whatsapp, customer.email].filter(Boolean).join(" · ")}
                  </div>
                )}
              </>
            )}
          </section>

          {invoice.show_consignee && (
          <section className={`rounded-lg border border-slate-200 bg-white/80 px-3 ${dense ? "py-2" : "py-2.5"}`}>
            <Label>{t("inv_consignee")}</Label>
            {invoice.consignee_name || invoice.consignee_address ? (
              <>
                {invoice.consignee_name && <div className="font-bold uppercase text-slate-900">{invoice.consignee_name}</div>}
                {invoice.consignee_address && <div className="whitespace-pre-line text-[11.5px] text-slate-600">{invoice.consignee_address}</div>}
                {invoice.consignee_phone && <div className="text-[11.5px] text-slate-600">{invoice.consignee_phone}</div>}
              </>
            ) : (
              <div className="text-[11.5px] text-slate-400">—</div>
            )}
            {invoice.notify_party && (
              <div className="mt-2 border-t border-dashed border-slate-200 pt-1.5">
                <div className="text-[10px] font-semibold uppercase text-slate-400">{t("c_notify_party")}</div>
                <div className="whitespace-pre-line text-[11.5px] text-slate-600">{invoice.notify_party}</div>
              </div>
            )}
          </section>
          )}

          <section className={`rounded-lg border border-slate-200 bg-white/80 px-3 ${dense ? "py-2" : "py-2.5"}`}>
            <Label>{t("inv_shipment")}</Label>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11.5px]">
              {(
                [
                  [t("inv_incoterm"), term],
                  [t("inv_shipment"), shipment],
                  [t("inv_pol"), invoice.port_of_loading],
                  [t("inv_pod"), invoice.port_of_discharge],
                  [t("inv_currency"), cur],
                ] as [string, string | null][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-semibold text-slate-800">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>

        {/* Items */}
        <table className={`${gap} w-full border-collapse ${dense ? "text-[11px]" : "text-[11.5px]"}`}>
          <thead>
            <tr className="bg-slate-900 text-[10px] uppercase tracking-wider text-white">
              <th className="w-8 whitespace-nowrap rounded-l-md px-2 py-2 text-left font-semibold">{t("inv_sr")}</th>
              <th className="px-2 py-2 text-left font-semibold">{t("inv_unit")}</th>
              <th className="px-2 py-2 text-left font-semibold">{t("inv_chassis")}</th>
              <th className="px-2 py-2 text-left font-semibold">{t("inv_engine")}</th>
              <th className="px-2 py-2 text-left font-semibold">{t("inv_color")}</th>
              <th className="px-2 py-2 text-center font-semibold">{t("inv_year")}</th>
              <th className="px-2 py-2 text-center font-semibold">{t("inv_qty")}</th>
              <th className="px-2 py-2 text-right font-semibold">{t("inv_unit_price")}</th>
              <th className="rounded-r-md px-2 py-2 text-right font-semibold" style={{ background: BRAND_RED }}>
                {t("inv_total")} {term}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const e = it.ext_vehicle;
              const v = it.vehicles ?? (e && (e.make || e.model)
                ? { stock_no: "", make: e.make, model: e.model, grade: e.grade ?? null, chassis_no: e.chassis_no ?? null, engine_cc: e.engine_cc ? Number(e.engine_cc) || null : null, color: e.color ?? null, year: e.year ? Number(e.year) || null : null }
                : null);
              return (
                <tr key={it.id} className="border-b border-slate-200 align-top even:bg-slate-50/70 [break-inside:avoid]">
                  <td className={`${cell} text-slate-500`}>{i + 1}</td>
                  {v ? (
                    <>
                      <td className={cell}>
                        <div className="font-bold uppercase text-slate-900">{[v.make, v.model].join(" ")}</div>
                        <div className="text-[10.5px] text-slate-500">
                          {[v.grade, v.stock_no && `Stock ${v.stock_no}`].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className={`${cell} font-mono text-[10.5px] uppercase break-all`}>{v.chassis_no ?? "—"}</td>
                      <td className={`${cell} whitespace-nowrap`}>{v.engine_cc ? `${num(v.engine_cc)} CC` : "—"}</td>
                      <td className={`${cell} uppercase`}>{v.color ?? "—"}</td>
                      <td className={`${cell} text-center`}>{v.year ?? "—"}</td>
                    </>
                  ) : (
                    <td className={`${cell} whitespace-pre-line`} colSpan={5}>
                      {it.description}
                    </td>
                  )}
                  <td className={`${cell} text-center tabular-nums`}>{Number(it.quantity)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{money(it.unit_price, cur, lang)}</td>
                  <td className={`${cell} text-right font-semibold tabular-nums text-slate-900`}>{money(it.amount, cur, lang)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Words + totals */}
        <div className={`${gap2} grid grid-cols-[1fr_18rem] gap-5 [break-inside:avoid]`}>
          <div className="self-end rounded-lg bg-slate-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t("inv_amount_words")}</div>
            <div className="mt-0.5 font-semibold text-slate-800">{amountInWords(Number(invoice.total), cur)}</div>
          </div>
          <table className="w-full text-[12px]">
            <tbody>
              {units > 0 && (
                <tr>
                  <td className="py-0.5 text-slate-500">{t("inv_units")}</td>
                  <td className="py-0.5 text-right tabular-nums">{units}</td>
                </tr>
              )}
              {discount > 0 && (
                <>
                  <tr>
                    <td className="py-0.5 text-slate-500">{t("inv_subtotal")}</td>
                    <td className="py-0.5 text-right tabular-nums">{money(invoice.subtotal, cur, lang)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 text-slate-500">{t("inv_discount")}</td>
                    <td className="py-0.5 text-right tabular-nums">− {money(discount, cur, lang)}</td>
                  </tr>
                </>
              )}
              {splitTotals && hasFreight(invoice.incoterm) && (
                <tr>
                  <td className="py-0.5 text-slate-500">
                    {t("inv_freight")}
                    {shipment ? ` (${shipment})` : ""}
                  </td>
                  <td className="py-0.5 text-right tabular-nums">{money(freight, cur, lang)}</td>
                </tr>
              )}
              {splitTotals && hasInsurance(invoice.incoterm) && (
                <tr>
                  <td className="py-0.5 text-slate-500">{t("inv_insurance")}</td>
                  <td className="py-0.5 text-right tabular-nums">{money(insurance, cur, lang)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="pt-2">
                  <div className="flex items-center justify-between rounded-md px-3 py-2 text-white" style={{ background: BRAND_RED }}>
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {t("inv_total")} {term} {cur}
                    </span>
                    <span className="text-[15px] font-black tabular-nums">{money(invoice.total, cur, lang)}</span>
                  </div>
                </td>
              </tr>
              {paid > 0 && (
                <>
                  <tr>
                    <td className="pt-1.5 text-slate-500">{t("inv_paid")}</td>
                    <td className="pt-1.5 text-right tabular-nums">{money(paid, cur, lang)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-0.5">{t("inv_balance")}</td>
                    <td className="py-0.5 text-right tabular-nums">{money(balance, cur, lang)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Banks */}
        {(settings?.bank_details || settings?.intermediary_bank) && (
          <div className={`${gap2} grid grid-cols-2 gap-3 ${dense ? "text-[10px] leading-tight" : "text-[10.5px] leading-snug"} [break-inside:avoid]`}>
            {settings?.bank_details && (
              <section className={`rounded-lg border border-slate-200 bg-slate-50 px-3 ${dense ? "py-1.5" : "py-2.5"}`}>
                <Label>{t("inv_beneficiary_bank")}</Label>
                <div className="whitespace-pre-line text-slate-700">{settings.bank_details}</div>
              </section>
            )}
            {settings?.intermediary_bank && (
              <section className={`rounded-lg border border-slate-200 bg-slate-50 px-3 ${dense ? "py-1.5" : "py-2.5"}`}>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900">{t("inv_intermediary_bank")}</div>
                <div className="whitespace-pre-line text-slate-700">{settings.intermediary_bank}</div>
              </section>
            )}
          </div>
        )}

        {/* Notes, terms, stamp */}
        <div className={`${gap2} grid ${qr ? "grid-cols-[1fr_auto_13rem]" : "grid-cols-[1fr_15rem]"} items-end gap-5 [break-inside:avoid]`}>
          <div className="text-[10.5px] leading-relaxed text-slate-600">
            {docType !== "invoice" && (
              <p className="mb-2 font-semibold text-slate-800">{t(docType === "quotation" ? "doc_quotation_note" : "doc_deposit_note")}</p>
            )}
            {invoice.notes && (
              <p className="mb-2 whitespace-pre-line">
                <span className="font-bold text-slate-800">{t("notes")}: </span>
                {invoice.notes}
              </p>
            )}
            {settings?.invoice_terms && (
              <p className="whitespace-pre-line">
                <span className="font-bold text-slate-800">{t("inv_terms")}: </span>
                {settings.invoice_terms}
              </p>
            )}
          </div>
          {qr && (
            <div className="text-center">
              <div className="mx-auto h-[68px] w-[68px] [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">{t("doc_scan_verify")}</div>
            </div>
          )}
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stamp} alt="" className="mx-auto h-[54px] w-auto object-contain" />
            <div className="mt-1 border-t border-slate-400 pt-1 text-[10px] uppercase tracking-wider text-slate-500">
              {t("inv_authorized")}
            </div>
          </div>
        </div>

        <footer className={`${gap2} flex items-center justify-between border-t border-slate-200 pt-1.5 text-[10px] text-slate-400`}>
          <span>{t("inv_thanks")}</span>
          <span>
            {company} · {invoice.invoice_no}
          </span>
        </footer>
      </div>
    </div>
  );
}
