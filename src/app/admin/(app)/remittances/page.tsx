import Link from "next/link";
import { PlusCircle, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { date, money } from "@/lib/format";
import { REMITTANCE_STATUSES, type Remittance, type RemittanceDocument } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { Empty, NumberedPagination, IconChip } from "@/components/ui";
import { PageSizeSelect, RowActions } from "./list-controls";
import { DocIcons } from "./doc-icons";

type Row = Remittance & {
  customers: { id: string; customer_no: number; name: string; phone: string | null; assigned_to: string | null } | null;
  remittance_documents: Pick<RemittanceDocument, "id" | "file_name" | "mime_type">[];
  remittance_allocations: { vehicles: { id: string; stock_no: string } | null }[];
};

const STATUS_COLOR: Record<string, string> = {
  unallocated: "bg-slate-100 text-slate-600 ring-slate-500/20",
  partial: "bg-amber-50 text-amber-700 ring-amber-600/20",
  allocated: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export default async function RemittancesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; office?: string; shift?: string; page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const size = [10, 25, 50, 100].includes(Number(sp.size)) ? Number(sp.size) : 10;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().replace(/[%,()]/g, " ");

  let query = supabase
    .from("remittances")
    .select(
      "*, customers(id, customer_no, name, phone, assigned_to), remittance_documents(id, file_name, mime_type), remittance_allocations(vehicles(id, stock_no))",
      { count: "exact" }
    )
    .order("id", { ascending: false })
    .range((page - 1) * size, page * size - 1);

  if (sp.status && (REMITTANCE_STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.office) query = query.eq("office", sp.office);
  if (sp.shift) query = query.eq("shift", sp.shift);
  if (q) {
    const ors = [`remitter.ilike.%${q}%`, `bank.ilike.%${q}%`];
    if (/^\d+$/.test(q)) ors.push(`id.eq.${q}`);
    const { data: cust } = await supabase
      .from("customers")
      .select("id")
      .or(`name.ilike.%${q}%,company.ilike.%${q}%,phone.ilike.%${q}%${/^\d+$/.test(q) ? `,customer_no.eq.${q}` : ""}`)
      .limit(500);
    if (cust?.length) ors.push(`customer_id.in.(${cust.map((c) => c.id).join(",")})`);
    const { data: veh } = await supabase.from("vehicles").select("id").or(`stock_no.ilike.%${q}%,chassis_no.ilike.%${q}%`).limit(200);
    if (veh?.length) {
      const { data: allocs } = await supabase
        .from("remittance_allocations")
        .select("remittance_id")
        .in("vehicle_id", veh.map((v) => v.id))
        .limit(1000);
      if (allocs?.length) ors.push(`id.in.(${[...new Set(allocs.map((a) => a.remittance_id))].join(",")})`);
    }
    query = query.or(ors.join(","));
  }

  const [{ data, count }, { data: staff }, { data: settings }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("settings").select("offices, shifts").single(),
  ]);
  const offices = profile.role !== "admin" && profile.office ? [profile.office] : ((settings?.offices ?? []) as string[]);
  const shifts = (settings?.shifts ?? []) as string[];
  const rows = (data ?? []) as unknown as Row[];
  const staffName = new Map((staff ?? []).map((p) => [p.id, p.full_name || p.email]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  const canEdit = can.editStock(profile.role);

  const href = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.status) u.set("status", sp.status);
    if (sp.office) u.set("office", sp.office);
    if (sp.shift) u.set("shift", sp.shift);
    if (size !== 10) u.set("size", String(size));
    u.set("page", String(p));
    return `/admin/remittances?${u}`;
  };

  return (
    <>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <IconChip tone="emerald">
            <Banknote />
          </IconChip>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("rem_title")}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("nav_remittances")} <span className="mx-1">›</span>
              <span className="text-slate-700">{t("rem_list")}</span>
            </p>
          </div>
        </div>
        {canEdit && (
          <Link href="/admin/remittances/new" className="btn-primary">
            <PlusCircle className="h-4 w-4" />
            {t("rem_add")}
          </Link>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <form action="/admin/remittances" className="flex flex-wrap items-center gap-2">
          <PageSizeSelect value={size} />
          <input name="q" defaultValue={sp.q ?? ""} placeholder={t("search_placeholder")} className="input w-56" />
          <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
            <option value="">
              {t("status")}: {t("all")}
            </option>
            {REMITTANCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`rs_${s}` as DictKey)}
              </option>
            ))}
          </select>
          {offices.length > 1 && (
            <select name="office" defaultValue={sp.office ?? ""} className="input w-auto">
              <option value="">
                {t("rem_office")}: {t("all")}
              </option>
              {offices.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          )}
          {shifts.length > 0 && (
            <select name="shift" defaultValue={sp.shift ?? ""} className="input w-auto">
              <option value="">
                {t("rem_shift")}: {t("all")}
              </option>
              {shifts.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          )}
          {size !== 10 && <input type="hidden" name="size" value={size} />}
          <button className="btn-secondary">{t("search")}</button>
        </form>
        <NumberedPagination page={page} pages={pages} makeHref={href} />
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty>{t("no_results")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3">{t("rem_id")}</th>
                  <th className="px-3 py-3">{t("rem_customer_details")}</th>
                  <th className="px-3 py-3">{t("rem_remitter_details")}</th>
                  <th className="px-3 py-3">{t("rem_remittance_details")}</th>
                  <th className="px-3 py-3">{t("rem_allocated_stock")}</th>
                  <th className="px-3 py-3">{t("status")}</th>
                  <th className="px-3 py-3 text-center">{t("rem_details")}</th>
                  <th className="px-3 py-3 text-center">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {rows.map((r) => {
                  const c = r.customers;
                  const stocks = [...new Map(r.remittance_allocations.filter((a) => a.vehicles).map((a) => [a.vehicles!.id, a.vehicles!])).values()];
                  const cur = r.currency;
                  return (
                    <tr key={r.id} className="align-top transition-colors hover:bg-emerald-50/40">
                      <td className="whitespace-nowrap px-3 py-3 leading-5">
                        <div>
                          {t("rem_id")}:{" "}
                          <Link href={`/admin/remittances/${r.id}`} className="text-slate-700 underline">
                            {r.id}
                          </Link>
                        </div>
                        <div>
                          {t("rem_created")}: {r.created_at.slice(0, 10)}
                        </div>
                        <div>
                          {t("rem_remit")}: {r.remit_date}
                        </div>
                        <div>
                          {t("rem_received")}: {r.received_date}
                        </div>
                        <div className="mt-1 inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                          {r.office}
                          {r.shift ? ` · ${r.shift}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-3 leading-5">
                        {c && (
                          <>
                            <div>
                              ID:{" "}
                              <Link href={`/admin/customers/${c.id}`} className="text-slate-700 underline">
                                {c.customer_no}
                              </Link>
                            </div>
                            <div className="font-medium uppercase text-slate-700">{c.name}</div>
                            {c.phone && (
                              <a href={`tel:${c.phone}`} className="text-slate-700 underline">
                                {c.phone}
                              </a>
                            )}
                            {c.assigned_to && (
                              <div>
                                {t("rem_tagged_with")}: {staffName.get(c.assigned_to)}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="max-w-[14rem] px-3 py-3 uppercase leading-5">
                        <div className="truncate" title={r.remitter}>
                          {r.remitter}
                        </div>
                        <div className="truncate" title={r.bank}>
                          {r.bank}
                        </div>
                        <div className="truncate" title={r.bank_address}>
                          {r.bank_address}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 leading-5">
                        <div>
                          {t("rem_exchange_rate")}: {Number(r.exchange_rate)}
                        </div>
                        <div>
                          {t("rem_instructed")}: {money(r.instructed_amount, cur, locale)}
                        </div>
                        <div>
                          {t("rem_remit_amount")}: {money(r.remit_amount, cur, locale)}
                        </div>
                        <div>
                          {t("rem_bank_charges")}: {money(r.bank_charges, cur, locale)}
                        </div>
                        <div>
                          {t("rem_remaining")}: {money(r.remaining_amount, cur, locale)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                          {stocks.map((v) => (
                            <Link key={v.id} href={`/admin/stock/${v.id}`} className="text-slate-700 hover:underline">
                              {v.stock_no}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ring-1 ring-inset ${STATUS_COLOR[r.status]}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                          {t(`rs_${r.status}` as DictKey)}
                        </span>
                        <DocIcons docs={r.remittance_documents} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {r.status !== "unallocated" && (
                          <Link href={`/admin/remittances/${r.id}`} className="text-red-600 hover:underline">
                            {t("rem_see_details")}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <RowActions
                          id={r.id}
                          canEdit={canEdit}
                          canDelete={profile.role === "admin"}
                          allocations={r.remittance_allocations.length}
                          remaining={Number(r.remaining_amount)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-end">
        <NumberedPagination page={page} pages={pages} makeHref={href} />
      </div>
    </>
  );
}
