import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { num } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { PageHeader, Empty, Pagination } from "@/components/ui";

const PAGE_SIZE = 25;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim();

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    const s = q.replace(/[%,()]/g, " ");
    query = query.or(
      `name.ilike.%${s}%,company.ilike.%${s}%,country.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%${/^\d+$/.test(s.trim()) ? `,customer_no.eq.${s.trim()}` : ""}`
    );
  }
  const [{ data, count }, { data: staff }] = await Promise.all([query, supabase.from("profiles").select("id, full_name, email")]);
  const staffName = new Map((staff ?? []).map((s) => [s.id, s.full_name || s.email]));
  const customers = (data ?? []) as Customer[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title={t("cust_title")}
        subtitle={t("total_records", { count: num(count ?? 0, locale) })}
        actions={
          <Link href="/customers/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            {t("cust_new")}
          </Link>
        }
      />
      <div className="card overflow-hidden">
        <form className="flex gap-2 border-b border-slate-100 p-3" action="/customers">
          <input name="q" defaultValue={q} placeholder={t("search_placeholder")} className="input max-w-xs" />
          <button className="btn-secondary">{t("search")}</button>
        </form>
        {customers.length === 0 ? (
          <Empty>{t("no_results")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("c_customer_no")}</th>
                  <th>{t("c_name")}</th>
                  <th>{t("c_company")}</th>
                  <th>{t("c_country")}</th>
                  <th>{t("c_port")}</th>
                  <th>{t("c_email")}</th>
                  <th>{t("c_phone")}</th>
                  <th>{t("rem_tagged_with")}</th>
                  <th className="text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="tabular-nums text-slate-500">{c.customer_no}</td>
                    <td>
                      <Link href={`/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td>{c.company ?? "—"}</td>
                    <td>{c.country ?? "—"}</td>
                    <td>{c.port ?? "—"}</td>
                    <td className="text-slate-600">{c.email ?? "—"}</td>
                    <td className="text-slate-600">{c.phone ?? c.whatsapp ?? "—"}</td>
                    <td className="text-slate-600">{c.assigned_to ? staffName.get(c.assigned_to) : "—"}</td>
                    <td className="text-right">
                      <Link href={`/customers/${c.id}/edit`} className="btn-secondary py-1 text-xs">
                        <Pencil className="h-3.5 w-3.5" />
                        {t("edit")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pages={pages}
          makeHref={(p) => `/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`}
          labels={{ previous: t("previous"), next: t("next"), pageOf: t("page_of", { page, pages }) }}
        />
      </div>
    </>
  );
}
