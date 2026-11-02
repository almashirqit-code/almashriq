import Link from "next/link";
import { RowsSelect } from "@/components/rows-select";
import { rowsParam } from "@/lib/rows";
import { Plus, Upload, Download, Car, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { num } from "@/lib/format";
import { SHIPPING_STATUSES, VEHICLE_STATUSES, type Currency, type ShippingStatus, type Vehicle } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, Empty, Pagination } from "@/components/ui";
import { StockRow } from "./stock-row";
import { loadRowExtras } from "./row-data";
import { loadRates } from "../reservations/data";
import { DEFAULT_BRANCHES } from "@/lib/branches";
import { Handshake } from "lucide-react";
import { SearchSelect } from "@/components/search-select";
import { fetchAll } from "@/lib/fetch-all";
import { loadStaff } from "../customers/staff";
import { applyStockFilters, effectiveShipping, relatedIds, searchOr, type StockFilter } from "./filters";

export type StockSearch = StockFilter & { page?: string; rows?: string };

/** Vehicle list for one ownership scope: own stock (/admin/stock) or third-party units (/admin/third-party). */
export async function StockList({ sp, scope }: { sp: StockSearch; scope: "own" | "third_party" }) {
  const base = scope === "own" ? "/admin/stock" : "/admin/third-party";
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const page = Math.max(1, Number(sp.page) || 1);

  const PAGE_SIZE = rowsParam(sp.rows);
  const q = (sp.q ?? "").trim();

  const base0 = supabase
    .from("vehicles")
    .select("*, vehicle_images(path, sort_order), auction_houses(name, ports(name)), yards(name, ports(name))", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "vehicle_images", ascending: true })
    .limit(1, { referencedTable: "vehicle_images" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    .eq("ownership", scope);
  const rel = await relatedIds(supabase, sp);
  const query = applyStockFilters(base0, sp, rel);

  const other = scope === "own" ? "third_party" : "own";
  const [{ data, count }, makesRes, otherRes, staff, customers] = await Promise.all([
    query,
    fetchAll<{ make: string | null }>((from, to) => supabase.from("vehicles").select("make").eq("ownership", scope).order("make").order("id").range(from, to)),
    // The top-bar search lands on own stock: tell staff when the match is in the other list.
    q
      ? supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("ownership", other)
          .or(searchOr(q, rel.ship))
      : Promise.resolve({ count: 0 }),
    loadStaff(),
    fetchAll<{ id: string; name: string; customer_no: number | null }>(
      (from, to) => supabase.from("customers").select("id, name, customer_no").order("name").order("id").range(from, to),
      10000
    ),
  ]);
  const otherCount = otherRes.count ?? 0;
  const vehicles = ((data ?? []) as (Vehicle & { shipping_status: ShippingStatus })[]).map((v) => ({ ...v, shipping_status: effectiveShipping(v) as ShippingStatus }));
  const { rates } = await loadRates();
  const extras = await loadRowExtras(
    vehicles.map((v) => ({ ...v, supplier_currency: (v.supplier_currency ?? null) as Currency | null })),
    rates
  );
  // One entry per make whatever its case ("TOYOTA" / "Toyota"); prefer the mixed-case spelling.
  const makeBy = new Map<string, string>();
  for (const { make } of makesRes) {
    const m = (make ?? "").trim();
    const k = m.toLowerCase();
    if (m && (!makeBy.has(k) || makeBy.get(k) === makeBy.get(k)!.toUpperCase())) makeBy.set(k, m);
  }
  const makes = [...makeBy.values()].sort((a, b) => a.localeCompare(b));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const canEdit = can.editStock(profile.role);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, status: sp.status, ship: sp.ship, make: sp.make, branch: sp.branch, agent: sp.agent, customer: sp.customer, rows: sp.rows, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `${base}?${p.toString()}`;
  };

  const exportFilters = { q, status: sp.status ?? "", ship: sp.ship ?? "", make: sp.make ?? "", branch: sp.branch ?? "", agent: sp.agent ?? "", customer: sp.customer ?? "", own: scope };
  const filtered = !!(q || sp.status || sp.ship || sp.make || sp.branch || sp.agent || sp.customer);

  return (
    <>
      <PageHeader
        icon={scope === "own" ? <Car /> : <Handshake />}
        tone="brand"
        title={scope === "own" ? t("stock_title") : t("nav_third_party")}
        subtitle={t("total_records", { count: num(count ?? 0, locale) })}
        actions={
          <>
            <a href={`/admin/stock/export?${new URLSearchParams({ format: "xlsx", ...exportFilters })}`} className="btn-secondary">
              <Download className="h-4 w-4" />
              Excel
            </a>
            <a href={`/admin/stock/export?${new URLSearchParams(exportFilters)}`} className="btn-secondary">
              <Download className="h-4 w-4" />
              {t("stock_export_csv")}
            </a>
            {can.editStock(profile.role) && (
              <>
                {scope === "third_party" && (
                  <Link href="/admin/stock/import-site" className="btn-secondary">
                    <Globe className="h-4 w-4" />
                    Import from website
                  </Link>
                )}
                <Link href="/admin/stock/import" className="btn-secondary">
                  <Upload className="h-4 w-4" />
                  {t("nav_import")}
                </Link>
                <Link href={scope === "own" ? "/admin/stock/new" : "/admin/stock/new?own=third_party"} className="btn-primary">
                  <Plus className="h-4 w-4" />
                  {t("stock_new")}
                </Link>
              </>
            )}
          </>
        }
      />

      <div className="card overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3" action={base}>
          <RowsSelect value={PAGE_SIZE} />
          <input name="q" defaultValue={q} placeholder={t("stock_search_ph")} aria-label={t("search")} className="input max-w-xs" />
          <SearchSelect
            name="status"
            label={t("status")}
            defaultValue={sp.status ?? ""}
            allLabel={`${t("status")}: ${t("all")}`}
            options={VEHICLE_STATUSES.map((s) => ({ value: s, label: t(`vs_${s}` as DictKey) }))}
          />
          <SearchSelect
            name="ship"
            label={t("stock_filter_ship")}
            defaultValue={sp.ship ?? ""}
            allLabel={`${t("stock_filter_ship")}: ${t("all")}`}
            options={SHIPPING_STATUSES.map((s) => ({ value: s, label: t(`ss_${s}` as DictKey) }))}
          />
          <SearchSelect
            name="make"
            label={t("stock_filter_make")}
            defaultValue={sp.make ?? ""}
            allLabel={`${t("stock_filter_make")}: ${t("all")}`}
            options={makes.map((m) => ({ value: m, label: m }))}
          />
          <SearchSelect
            name="branch"
            label={t("f_branch")}
            defaultValue={sp.branch ?? ""}
            allLabel={`${t("f_branch")}: ${t("all")}`}
            options={DEFAULT_BRANCHES.map((b) => ({ value: b.code, label: b.name }))}
          />
          <SearchSelect
            name="agent"
            label={t("stock_filter_agent")}
            defaultValue={sp.agent ?? ""}
            allLabel={`${t("stock_filter_agent")}: ${t("all")}`}
            options={staff.map((p) => ({ value: p.id, label: p.name }))}
          />
          <SearchSelect
            name="customer"
            label={t("rv_customer")}
            defaultValue={sp.customer ?? ""}
            allLabel={`${t("rv_customer")}: ${t("all")}`}
            options={customers.map((c) => ({ value: c.id, label: c.customer_no ? `${c.name} · #${c.customer_no}` : c.name }))}
          />
          <button className="btn-secondary">{t("search")}</button>
          {filtered && (
            <Link href={base} className="btn-ghost text-xs">
              {t("clear")}
            </Link>
          )}
        </form>

        {otherCount > 0 && (
          <Link
            href={`${scope === "own" ? "/admin/third-party" : "/admin/stock"}?q=${encodeURIComponent(q)}`}
            className="flex items-center gap-2 border-b border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 hover:bg-sky-100"
          >
            {scope === "own" ? <Handshake className="h-4 w-4" /> : <Car className="h-4 w-4" />}
            {scope === "own" ? t("tp_matches", { count: otherCount }) : `${otherCount} → ${t("stock_title")}`}
          </Link>
        )}
        {vehicles.length === 0 ? (
          <Empty>{t("no_results")}</Empty>
        ) : (
          <div className="space-y-3 bg-slate-50/50 p-3">
            {vehicles.map((v) => (
              <StockRow
                key={v.id}
                v={v}
                x={extras.get(v.id)!}
                t={t}
                locale={locale}
                seeCost={can.seeCost(profile.role)}
                canEdit={canEdit}
                canDelete={can.deleteStock(profile.role)}
              />
            ))}
          </div>
        )}
        <Pagination
          page={page}
          pages={pages}
          makeHref={(p) => qs({ page: p })}
          labels={{ previous: t("previous"), next: t("next"), pageOf: t("page_of", { page, pages }) }}
        />
      </div>
    </>
  );
}
