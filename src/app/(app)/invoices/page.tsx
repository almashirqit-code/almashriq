import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { money, date, num } from "@/lib/format";
import { INVOICE_STATUSES, type Invoice } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, InvoiceStatusBadge, Empty, Pagination } from "@/components/ui";

const PAGE_SIZE = 25;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, " ");

  let query = supabase
    .from("invoices")
    .select("*, customers!inner(id, name, company, country)", { count: "exact" })
    .order("issue_date", { ascending: false })
    .order("invoice_no", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.status && (INVOICE_STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status);

  // Match invoice number OR customer name/company.
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

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.status) params.set("status", sp.status);
    params.set("page", String(p));
    return `/invoices?${params}`;
  };

  return (
    <>
      <PageHeader
        title={t("inv_title")}
        subtitle={t("total_records", { count: num(count ?? 0, locale) })}
        actions={
          <Link href="/invoices/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            {t("inv_new")}
          </Link>
        }
      />
      <div className="card overflow-hidden">
        <form className="flex flex-wrap gap-2 border-b border-slate-100 p-3" action="/invoices">
          <input name="q" defaultValue={sp.q ?? ""} placeholder={t("search_placeholder")} className="input max-w-xs" />
          <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
            <option value="">
              {t("status")}: {t("all")}
            </option>
            {INVOICE_STATUSES.map((s) => (
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
                  <th>{t("inv_no")}</th>
                  <th>{t("inv_customer")}</th>
                  <th>{t("inv_issue_date")}</th>
                  <th className="text-right">{t("inv_total")}</th>
                  <th className="text-right">{t("inv_balance")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const bal = Number(inv.total) - Number(inv.amount_paid);
                  return (
                    <tr key={inv.id}>
                      <td>
                        <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
                          {inv.invoice_no}
                        </Link>
                      </td>
                      <td>
                        <div>{inv.customers?.name}</div>
                        <div className="text-xs text-slate-500">{[inv.customers?.company, inv.customers?.country].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="text-slate-600">{date(inv.issue_date, locale)}</td>
                      <td className="text-right tabular-nums">{money(inv.total, inv.currency, locale)}</td>
                      <td className={`text-right tabular-nums ${bal > 0 && inv.status !== "draft" && inv.status !== "cancelled" ? "text-red-600" : "text-slate-400"}`}>
                        {inv.status === "draft" || inv.status === "cancelled" ? "—" : money(bal, inv.currency, locale)}
                      </td>
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
