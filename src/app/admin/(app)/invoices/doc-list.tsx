import Link from "next/link";
import { RowsSelect } from "@/components/rows-select";
import { rowsParam } from "@/lib/rows";
import { Plus, FileText, FileSignature, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { money, date, num } from "@/lib/format";
import { DOC_LIST_PATH, DOC_TYPES, INVOICE_STATUSES, type DocType, type Invoice } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, InvoiceStatusBadge, Empty, Pagination } from "@/components/ui";

const ICON: Record<DocType, React.ReactNode> = { invoice: <FileText />, quotation: <FileSignature />, auction_deposit: <Gavel /> };
const TONE = { invoice: "fuchsia", quotation: "sky", auction_deposit: "amber" } as const;

export type DocListParams = { q?: string; status?: string; page?: string; rows?: string };

/** Tabs linking the Invoices sub-pages: Invoices · Quotations · Auction deposits. */
export async function DocTabs({ active }: { active: DocType }) {
  const { t } = await getT();
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/70" aria-label={t("inv_title")}>
      {DOC_TYPES.map((d) => (
        <Link
          key={d}
          href={DOC_LIST_PATH[d]}
          aria-current={d === active ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            d === active ? "bg-jet-950 text-white shadow" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span className="[&_svg]:h-4 [&_svg]:w-4">{ICON[d]}</span>
          {t(`doc_${d}` as DictKey)}
        </Link>
      ))}
    </nav>
  );
}

/** List page for one document type (invoices, quotations or auction deposits). */
export async function DocList({ docType, sp }: { docType: DocType; sp: DocListParams }) {
  const { t, locale } = await getT();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  const PAGE_SIZE = rowsParam(sp.rows);
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, " ");
  const path = DOC_LIST_PATH[docType];
  const isQuote = docType === "quotation";

  let query = supabase
    .from("invoices")
    .select("*, customers!inner(id, name, company, country)", { count: "exact" })
    .eq("doc_type", docType)
    .order("issue_date", { ascending: false })
    .order("invoice_no", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.status && (INVOICE_STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status);

  // Match document number OR customer name/company.
  if (q) {
    const { data: matchCustomers } = await supabase
      .from("customers")
      .select("id")
      .or(`name.ilike.%${q}%,company.ilike.%${q}%`)
      .limit(500);
    const ids = (matchCustomers ?? []).map((c) => c.id);
    query = ids.length
      ? query.or(`invoice_no.ilike.%${q}%,customer_id.in.(${ids.join(",")})`)
      : query.ilike("invoice_no", `%${q}%`);
  }

  const { data, count } = await query;
  const invoices = (data ?? []) as Invoice[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  // Quotations: which ones already became an invoice.
  const converted = new Map<string, { id: string; invoice_no: string }>();
  if (isQuote && invoices.length) {
    const { data: conv } = await supabase
      .from("invoices")
      .select("id, invoice_no, converted_from")
      .in("converted_from", invoices.map((i) => i.id))
      .neq("status", "cancelled");
    for (const c of conv ?? []) converted.set(c.converted_from as string, { id: c.id, invoice_no: c.invoice_no });
  }

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.status) params.set("status", sp.status);
    if (sp.rows) params.set("rows", sp.rows);
    params.set("page", String(p));
    return `${path}?${params}`;
  };
  // Quotations are never paid; drop the payment statuses from their filter.
  const statuses = isQuote ? INVOICE_STATUSES.filter((s) => s !== "paid" && s !== "partially_paid") : INVOICE_STATUSES;

  return (
    <>
      <PageHeader
        icon={ICON[docType]}
        tone={TONE[docType]}
        title={t(`doc_${docType}` as DictKey)}
        subtitle={t("total_records", { count: num(count ?? 0, locale) })}
        actions={
          <Link href={`/admin/invoices/new?type=${docType}`} className="btn-primary">
            <Plus className="h-4 w-4" />
            {t(`doc_new_${docType}` as DictKey)}
          </Link>
        }
      />
      <DocTabs active={docType} />
      <div className="card overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3" action={path}>
          <RowsSelect value={PAGE_SIZE} />
          <input name="q" defaultValue={sp.q ?? ""} placeholder={t("search_placeholder")} className="input max-w-xs" />
          <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
            <option value="">
              {t("status")}: {t("all")}
            </option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {t(`is_${s}` as DictKey)}
              </option>
            ))}
          </select>
          <button className="btn-secondary">{t("search")}</button>
        </form>
        {invoices.length === 0 ? (
          <Empty>{t("no_results")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t(`doc_no_${docType}` as DictKey)}</th>
                  <th>{t("inv_customer")}</th>
                  <th>{t("inv_issue_date")}</th>
                  {isQuote && <th>{t("doc_valid_until")}</th>}
                  <th className="text-right">{t("inv_total")}</th>
                  {isQuote ? <th>{t("doc_converted_to")}</th> : <th className="text-right">{t("inv_balance")}</th>}
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const bal = Number(inv.total) - Number(inv.amount_paid);
                  const conv = converted.get(inv.id);
                  return (
                    <tr key={inv.id}>
                      <td>
                        <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
                          {inv.invoice_no}
                        </Link>
                      </td>
                      <td>
                        <div>{inv.customers?.name}</div>
                        <div className="text-xs text-slate-500">{[inv.customers?.company, inv.customers?.country].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="text-slate-600">{date(inv.issue_date, locale)}</td>
                      {isQuote && <td className="text-slate-600">{inv.valid_until ? date(inv.valid_until, locale) : "—"}</td>}
                      <td className="text-right tabular-nums">{money(inv.total, inv.currency, locale)}</td>
                      {isQuote ? (
                        <td>
                          {conv ? (
                            <Link href={`/admin/invoices/${conv.id}`} className="font-medium text-cerulean-700 hover:underline">
                              {conv.invoice_no}
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      ) : (
                        <td className={`text-right tabular-nums ${bal > 0 && inv.status !== "draft" && inv.status !== "cancelled" ? "text-red-600" : "text-slate-400"}`}>
                          {inv.status === "draft" || inv.status === "cancelled" ? "—" : money(bal, inv.currency, locale)}
                        </td>
                      )}
                      <td>
                        <InvoiceStatusBadge status={inv.status} label={t(`is_${inv.status}` as DictKey)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pages={pages}
          makeHref={href}
          labels={{ previous: t("previous"), next: t("next"), pageOf: t("page_of", { page, pages }) }}
        />
      </div>
    </>
  );
}
