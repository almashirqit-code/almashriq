import Link from "next/link";
import { RowsSelect } from "@/components/rows-select";
import { rowsParam } from "@/lib/rows";
import { Plus, Upload, Download, Car, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { num } from "@/lib/format";
import { SHIPPING_STATUSES, type Currency, type ShippingStatus, type Vehicle } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, Empty, Pagination } from "@/components/ui";
import { StockRow } from "./stock-row";
import { loadRowExtras } from "./row-data";
import { loadRates } from "../reservations/data";
import { Handshake } from "lucide-react";

const SALE_STATUSES = ["in_stock", "reserved", "sold"] as const;


export type StockSearch = { q?: string; status?: string; ship?: string; make?: string; page?: string; rows?: string };

/** Vehicle list for one ownership scope: own stock (/admin/stock) or third-party units (/admin/third-party). */
export async function StockList({ sp, scope }: { sp: StockSearch; scope: "own" | "third_party" }) {
  const base = scope === "own" ? "/admin/stock" : "/admin/third-party";
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const page = Math.max(1, Number(sp.page) || 1);

  const PAGE_SIZE = rowsParam(sp.rows);
  const q = (sp.q ?? "").trim();

  let query = supabase
    .from("vehicles")
    .select("*, vehicle_images(path, sort_order), auction_houses(name, ports(name)), yards(name, ports(name))", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "vehicle_images", ascending: true })
    .limit(1, { referencedTable: "vehicle_images" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    .eq("ownership", scope);

  if (sp.status && (SALE_STATUSES as readonly string[]).includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.ship && (SHIPPING_STATUSES as string[]).includes(sp.ship)) query = query.eq("shipping_status", sp.ship);
  if (sp.make) query = query.eq("make", sp.make);
  if (q) {
    const s = q.replace(/[%,()]/g, " ");
    query = query.or(
      `stock_no.ilike.%${s}%,chassis_no.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%,grade.ilike.%${s}%,color.ilike.%${s}%`
    );
  }

  const other = scope === "own" ? "third_party" : "own";
  const [{ data, count }, makesRes, otherRes] = await Promise.all([
    query,
    supabase.from("vehicles").select("make").eq("ownership", scope).order("make").limit(5000),
    // The top-bar search lands on own stock: tell staff when the match is in the other list.
    q
      ? supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("ownership", other)
          .or(`stock_no.ilike.%${q.replace(/[%,()]/g, " ")}%,chassis_no.ilike.%${q.replace(/[%,()]/g, " ")}%,make.ilike.%${q.replace(/[%,()]/g, " ")}%,model.ilike.%${q.replace(/[%,()]/g, " ")}%`)
      : Promise.resolve({ count: 0 }),
  ]);
  const otherCount = otherRes.count ?? 0;
  const vehicles = (data ?? []) as (Vehicle & { shipping_status: ShippingStatus })[];
  const { rates } = await loadRates();
  const extras = await loadRowExtras(
    vehicles.map((v) => ({ ...v, supplier_currency: (v.supplier_currency ?? null) as Currency | null })),
    rates
  );
  const makes = [...new Set((makesRes.data ?? []).map((m) => m.make as string))];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const canEdit = can.editStock(profile.role);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, status: sp.status, ship: sp.ship, make: sp.make, rows: sp.rows, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `${base}?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        icon={scope === "own" ? <Car /> : <Handshake />}
        tone="brand"
        title={scope === "own" ? t("stock_title") : t("nav_third_party")}
        subtitle={t("total_records", { count: num(count ?? 0, locale) })}
        actions={
          <>
            <a href={`/admin/stock/export?${new URLSearchParams({ q, status: sp.status ?? "", make: sp.make ?? "", own: scope })}`} className="btn-secondary">
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
          <input name="q" defaultValue={q} placeholder={t("search_placeholder")} className="input max-w-xs" />
          <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
            <option value="">
              {t("status")}: {t("all")}
            </option>
            {SALE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`vs_${s}` as DictKey)}
              </option>
            ))}
          </select>
          <select name="ship" defaultValue={sp.ship ?? ""} className="input w-auto">
            <option value="">
              {t("stock_filter_ship")}: {t("all")}
            </option>
            {SHIPPING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`ss_${s}` as DictKey)}
              </option>
            ))}
          </select>
          <select name="make" defaultValue={sp.make ?? ""} className="input w-auto">
            <option value="">
              {t("stock_filter_make")}: {t("all")}
            </option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button className="btn-secondary">{t("search")}</button>
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
