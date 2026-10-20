import Link from "next/link";
import { Plus, Upload, Download, ImageIcon, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { money, num, publicImageUrl, vehicleTitle } from "@/lib/format";
import { VEHICLE_STATUSES, type Vehicle } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { PageHeader, VehicleStatusBadge, Empty, Pagination, Badge, PartsBadge } from "@/components/ui";
import { VehicleRowActions } from "./row-actions";

const PAGE_SIZE = 25;

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; make?: string; own?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getProfile();
  const { t, locale } = await getT();
  const supabase = await createClient();

  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim();

  let query = supabase
    .from("vehicles")
    .select("*, vehicle_images(path, sort_order), reservations(id, status)", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("sort_order", { referencedTable: "vehicle_images", ascending: true })
    .limit(1, { referencedTable: "vehicle_images" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (sp.status && (VEHICLE_STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status);
  if (sp.make) query = query.eq("make", sp.make);
  if (sp.own === "own" || sp.own === "third_party") query = query.eq("ownership", sp.own);
  if (q) {
    const s = q.replace(/[%,()]/g, " ");
    query = query.or(
      `stock_no.ilike.%${s}%,chassis_no.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%,grade.ilike.%${s}%,color.ilike.%${s}%`
    );
  }

  const [{ data, count }, makesRes] = await Promise.all([
    query,
    supabase.from("vehicles").select("make").order("make").limit(5000),
  ]);
  const vehicles = (data ?? []) as Vehicle[];
  const makes = [...new Set((makesRes.data ?? []).map((m) => m.make as string))];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const canEdit = can.editStock(profile.role);

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, status: sp.status, make: sp.make, own: sp.own, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/stock?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        icon={<Car />}
        tone="brand"
        title={t("stock_title")}
        subtitle={t("total_records", { count: num(count ?? 0, locale) })}
        actions={
          <>
            <a href={`/stock/export?${new URLSearchParams({ q, status: sp.status ?? "", make: sp.make ?? "", own: sp.own ?? "" })}`} className="btn-secondary">
              <Download className="h-4 w-4" />
              {t("stock_export_csv")}
            </a>
            {can.editStock(profile.role) && (
              <>
                <Link href="/stock/import" className="btn-secondary">
                  <Upload className="h-4 w-4" />
                  {t("nav_import")}
                </Link>
                <Link href="/stock/new" className="btn-primary">
                  <Plus className="h-4 w-4" />
                  {t("stock_new")}
                </Link>
              </>
            )}
          </>
        }
      />

      <div className="card overflow-hidden">
        <form className="flex flex-wrap gap-2 border-b border-slate-100 p-3" action="/stock">
          <input name="q" defaultValue={q} placeholder={t("search_placeholder")} className="input max-w-xs" />
          <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
            <option value="">
              {t("status")}: {t("all")}
            </option>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`vs_${s}` as DictKey)}
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
          <select name="own" defaultValue={sp.own ?? ""} className="input w-auto">
            <option value="">
              {t("f_ownership")}: {t("all")}
            </option>
            <option value="own">{t("own_own")}</option>
            <option value="third_party">{t("own_third_party")}</option>
          </select>
          <button className="btn-secondary">{t("search")}</button>
        </form>

        {vehicles.length === 0 ? (
          <Empty>{t("no_results")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-20"></th>
                  <th>{t("f_stock_no")}</th>
                  <th>{t("stock_details")}</th>
                  <th>{t("f_chassis_no")}</th>
                  <th className="text-right">{t("f_mileage")}</th>
                  <th className="text-right">{t("f_price")}</th>
                  <th>{t("status")}</th>
                  <th className="text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const img = v.vehicle_images?.[0];
                  return (
                    <tr key={v.id}>
                      <td>
                        <Link href={`/stock/${v.id}`} className="block h-12 w-16 overflow-hidden rounded-md bg-slate-100">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={publicImageUrl(img.path)} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-300">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/stock/${v.id}`} className="font-medium text-brand-700 hover:underline">
                          {v.stock_no}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {v.ownership === "third_party" && (
                            <Badge className="bg-amber-50 text-amber-800 ring-amber-600/20">{t("own_third_party_short")}</Badge>
                          )}
                          {v.for_parts && <PartsBadge label={t("parts_badge")} />}
                          {v.show_on_website && <Badge className="bg-sky-50 text-sky-700 ring-sky-600/20">Web</Badge>}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{vehicleTitle(v)}</div>
                        <div className="text-xs text-slate-500">
                          {[v.color, v.engine_cc ? `${v.engine_cc}cc` : null, v.transmission, v.fuel].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="font-mono text-xs text-slate-600">{v.chassis_no ?? "—"}</td>
                      <td className="text-right tabular-nums">{num(v.mileage, locale)}</td>
                      <td className="text-right tabular-nums">{v.price != null ? money(v.price, v.price_currency, locale) : "—"}</td>
                      <td>
                        <VehicleStatusBadge status={v.status} label={t(`vs_${v.status}` as DictKey)} />
                      </td>
                      <td className="text-right">
                        <VehicleRowActions
                          id={v.id}
                          stockNo={v.stock_no}
                          status={v.status}
                          showOnWebsite={!!v.show_on_website}
                          forParts={!!v.for_parts}
                          canEdit={canEdit}
                          canDelete={can.deleteStock(profile.role)}
                          canInvoice
                          reservationId={
                            (v as unknown as { reservations?: { id: string; status: string }[] }).reservations?.find((r) => r.status === "active")?.id ?? null
                          }
                        />
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
          makeHref={(p) => qs({ page: p })}
          labels={{ previous: t("previous"), next: t("next"), pageOf: t("page_of", { page, pages }) }}
        />
      </div>
    </>
  );
}
