import Link from "next/link";
import { Plus, Pencil, Users, Mail, Phone, MapPin } from "lucide-react";
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
        icon={<Users />}
        tone="sky"
        title={t("cust_title")}
        subtitle={t("total_records", { count: num(count ?? 0, locale) })}
        actions={
          <Link href="/admin/customers/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            {t("cust_new")}
          </Link>
        }
      />
      <div className="card overflow-hidden">
        <form className="flex gap-2 border-b border-slate-100 p-3" action="/admin/customers">
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
                  <th className="w-16">{t("c_customer_no")}</th>
                  <th>{t("c_name")}</th>
                  <th>{t("c_country")}</th>
                  <th>{t("c_email")} / {t("c_phone")}</th>
                  <th>{t("rem_tagged_with")}</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const phone = c.phone ?? c.whatsapp;
                  const staff = c.assigned_to ? staffName.get(c.assigned_to) : null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="inline-flex min-w-8 justify-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-600">{c.customer_no}</span>
                      </td>
                      <td className="max-w-[16rem]">
                        <Link href={`/admin/customers/${c.id}`} className="block truncate font-semibold text-brand-700 hover:underline">
                          {c.name}
                        </Link>
                        {c.company && <div className="truncate text-xs text-slate-500">{c.company}</div>}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="font-medium uppercase text-slate-800">{c.country ?? "—"}</div>
                        {c.port && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3 w-3 text-cyan-500" />
                            {c.port}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[18rem]">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 truncate text-slate-600 hover:text-brand-700" title={c.email}>
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{c.email}</span>
                          </a>
                        )}
                        {phone && (
                          <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-700">
                            <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                            {phone}
                          </a>
                        )}
                        {!c.email && !phone && "—"}
                      </td>
                      <td>
                        {staff ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20">
                            {staff}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/admin/customers/${c.id}/edit`}
                          className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700"
                          title={t("edit")}
                          aria-label={t("edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
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
          makeHref={(p) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`}
          labels={{ previous: t("previous"), next: t("next"), pageOf: t("page_of", { page, pages }) }}
        />
      </div>
    </>
  );
}
