import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { money, date, num } from "@/lib/format";
import { translate, type DictKey, type Locale } from "@/lib/i18n/dictionaries";
import { TAXED_EXPENSES, type Customer, type ExpenseItem, type Settings, type Vehicle } from "@/lib/types";
import { PrintButton } from "@/components/buttons";
import { LOGO_SRC } from "@/components/brand/logo";

export const metadata = { title: "Auction invoice breakdown" };

const BRAND_RED = "#d71920"; // logo red

type V = Vehicle & { auction_houses: { name: string } | null };

/**
 * Auction invoice breakdown: the real auction purchase cost of each car, line by line
 * (hammer price, consumption tax, auction fee, recycle fee, transport, our fees…).
 * Open with ?invoice=<id> (every car on that invoice) or ?vehicle=<id>.
 */
export default async function AuctionBreakdownPage({ searchParams }: { searchParams: Promise<{ invoice?: string; vehicle?: string; lang?: string }> }) {
  await requireRole(["admin", "manager"]);
  const sp = await searchParams;
  const lang: Locale = sp.lang === "ja" ? "ja" : "en";
  const t = (k: DictKey) => translate(lang, k);
  const supabase = await createClient();

  let vehicleIds: string[] = [];
  let customer: Customer | null = null;
  let ref: string | null = null;
  if (sp.invoice) {
    const { data: inv } = await supabase.from("invoices").select("invoice_no, customer_id").eq("id", sp.invoice).maybeSingle();
    if (!inv) notFound();
    ref = String(inv.invoice_no);
    const [{ data: items }, { data: c }] = await Promise.all([
      supabase.from("invoice_items").select("vehicle_id").eq("invoice_id", sp.invoice).not("vehicle_id", "is", null).order("sort_order"),
      supabase.from("customers").select("*").eq("id", inv.customer_id).maybeSingle(),
    ]);
    vehicleIds = (items ?? []).map((i) => i.vehicle_id as string);
    customer = c as Customer | null;
  } else if (sp.vehicle) {
    vehicleIds = [sp.vehicle];
    const { data: r } = await supabase
      .from("reservations")
      .select("customers(*)")
      .eq("vehicle_id", sp.vehicle)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    customer = (r?.customers as unknown as Customer) ?? null;
  }
  if (!vehicleIds.length) notFound();

  const [{ data: vs }, { data: settings }] = await Promise.all([
    supabase.from("vehicles").select("*, auction_houses(name)").in("id", vehicleIds),
    supabase.from("settings").select("*").single(),
  ]);
  const order = new Map(vehicleIds.map((id, i) => [id, i]));
  const vehicles = ((vs ?? []) as V[]).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  if (!vehicles.length) notFound();
  const s = settings as Settings | null;
  const company = s?.company_name || "AL MASHRIQ TRADING CO., LTD.";
  const yen = (n: number) => money(n, "JPY", lang);

  const rows = vehicles.map((v) => {
    const rate = Number(v.purchase_tax_rate ?? 0);
    const hammer = Number(v.purchase_price ?? 0);
    const items: ExpenseItem[] = Array.isArray(v.expense_items) && v.expense_items.length
      ? v.expense_items
      : Number(v.expenses) > 0
        ? [{ type: "other", amount: Number(v.expenses) }]
        : [];
    const lines: { label: string; amount: number; sub?: boolean }[] = [{ label: lang === "ja" ? "落札価格" : "Auction (hammer) price", amount: hammer }];
    if (rate > 0 && hammer > 0) lines.push({ label: `${lang === "ja" ? "消費税" : "Consumption tax"} ${rate}%`, amount: Math.round((hammer * rate) / 100), sub: true });
    for (const e of items) {
      const amt = Number(e.amount) || 0;
      lines.push({ label: t(`exp_${e.type}` as DictKey) + (e.note ? ` — ${e.note}` : ""), amount: amt });
      if (TAXED_EXPENSES.includes(e.type) && rate > 0) lines.push({ label: `${lang === "ja" ? "消費税" : "Consumption tax"} ${rate}%`, amount: Math.round((amt * rate) / 100), sub: true });
    }
    const total = lines.reduce((s, l) => s + l.amount, 0);
    // Amounts are in the vehicle's cost currency; convert to JPY for the USD figure and grand total.
    const cur = v.cost_currency ?? "JPY";
    const totalJpy = Math.round(total * (Number(v.cost_fx_rate) || 1));
    const fx = Number(v.fob_fx_rate) || 0;
    return { v, lines, total, cur, totalJpy, fx, usd: fx > 0 ? Math.round((totalJpy / fx) * 100) / 100 : null };
  });
  const grand = rows.reduce((s, r) => s + r.totalJpy, 0);
  const grandUsd = rows.every((r) => r.usd != null) ? rows.reduce((s, r) => s + (r.usd ?? 0), 0) : null;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2">
        <a href={`?${new URLSearchParams({ ...(sp.invoice ? { invoice: sp.invoice } : { vehicle: sp.vehicle! }), lang: lang === "ja" ? "en" : "ja" })}`} className="btn-secondary">
          {lang === "ja" ? "English" : "日本語"}
        </a>
        <PrintButton>{t("print")}</PrintButton>
      </div>
      <div className="mx-auto max-w-[210mm] bg-white px-10 py-8 text-[12px] leading-snug text-slate-800 shadow-lg print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s?.logo_url || LOGO_SRC} alt={company} className="h-[72px] w-auto object-contain" />
          <div className="text-right text-[11px] text-slate-600">
            <div className="text-[15px] font-extrabold uppercase tracking-wide text-slate-900">{company}</div>
            {s?.address && <div className="whitespace-pre-line">{s.address}</div>}
            <div>{[s?.phone && `Tel: ${s.phone}`, s?.email].filter(Boolean).join("  ·  ")}</div>
          </div>
        </header>
        <div className="mt-4 flex h-[5px] overflow-hidden rounded-full">
          <div className="w-2/3" style={{ background: BRAND_RED }} />
          <div className="w-1/3 bg-slate-900" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[26px] font-black leading-none tracking-tight text-slate-900">{lang === "ja" ? "オークション仕入明細書" : "Auction Invoice Breakdown"}</h1>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{lang === "ja" ? "落札価格・諸費用の内訳" : "Purchase cost at auction in Japan"}</div>
          </div>
          <table className="text-[11.5px]">
            <tbody>
              {ref && (
                <tr>
                  <td className="pr-4 text-right text-slate-500">{t("inv_no")}</td>
                  <td className="text-right font-bold"># {ref}</td>
                </tr>
              )}
              <tr>
                <td className="pr-4 text-right text-slate-500">{lang === "ja" ? "発行日" : "Date"}</td>
                <td className="text-right font-bold">{date(new Date().toISOString().slice(0, 10), lang)}</td>
              </tr>
              <tr>
                <td className="pr-4 text-right text-slate-500">{lang === "ja" ? "台数" : "Units"}</td>
                <td className="text-right font-bold">{rows.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {customer && (
          <section className="mt-4 rounded-lg border border-slate-200 px-3 py-2.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: BRAND_RED }}>
              {t("inv_bill_to")}
            </div>
            <div className="text-[13px] font-bold uppercase text-slate-900">{customer.name}</div>
            <div className="text-[11.5px] text-slate-600">{[customer.company, customer.country, customer.email].filter(Boolean).join(" · ")}</div>
          </section>
        )}

        {rows.map(({ v, lines, total, cur, totalJpy, fx, usd }, i) => (
          <section key={v.id} className="mt-4 overflow-hidden rounded-lg border border-slate-200 [break-inside:avoid]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 bg-slate-900 px-3 py-2 text-white">
              <div className="font-bold uppercase">
                {i + 1}. {[v.year, v.make, v.model, v.grade].filter(Boolean).join(" ")}
              </div>
              <div className="text-[11px] text-white/70">Stock {v.stock_no}</div>
            </div>
            <dl className="grid grid-cols-4 gap-x-4 gap-y-1 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
              {(
                [
                  [t("inv_chassis"), v.chassis_no],
                  [lang === "ja" ? "オークション会場" : "Auction house", v.auction_houses?.name ?? null],
                  [lang === "ja" ? "落札日" : "Auction date", v.purchase_date ? date(v.purchase_date, lang) : null],
                  [lang === "ja" ? "評価点" : "Auction grade", v.auction_grade],
                  [lang === "ja" ? "走行距離" : "Mileage", v.mileage != null ? `${num(v.mileage)} km` : null],
                  [t("inv_engine"), v.engine_cc ? `${num(v.engine_cc)} cc` : null],
                  [t("inv_color"), v.color],
                ] as [string, string | null][]
              ).map(([k, val]) => (
                <div key={k}>
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="font-semibold uppercase text-slate-800">{val || "—"}</dd>
                </div>
              ))}
            </dl>
            <table className="w-full text-[11.5px]">
              <tbody>
                {lines.map((l, k) => (
                  <tr key={k} className="border-b border-slate-100">
                    <td className={`px-3 py-1.5 ${l.sub ? "pl-8 text-slate-500" : "text-slate-800"}`}>{l.label}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${l.sub ? "text-slate-500" : ""}`}>{money(l.amount, cur, lang)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="px-3 py-2">{cur === "JPY" ? (lang === "ja" ? "合計（円）" : "Total (JPY)") : `${lang === "ja" ? "合計" : "Total"} (${cur})`}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(total, cur, lang)}</td>
                </tr>
                {cur !== "JPY" && (
                  <tr className="text-slate-600">
                    <td className="px-3 py-1.5">
                      {lang === "ja" ? "円換算" : "JPY equivalent"} (1 {cur} = {num(Number(v.cost_fx_rate))} JPY)
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{yen(totalJpy)}</td>
                  </tr>
                )}
                {usd != null && (
                  <tr className="text-slate-600">
                    <td className="px-3 py-1.5">
                      {lang === "ja" ? "米ドル換算" : "USD equivalent"} (1 USD = {num(fx)} JPY)
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{money(usd, "USD", lang)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        ))}

        {rows.length > 1 && (
          <div className="mt-4 flex items-center justify-between rounded-md px-3 py-2 text-white [break-inside:avoid]" style={{ background: BRAND_RED }}>
            <span className="text-[11px] font-bold uppercase tracking-wider">{lang === "ja" ? "総合計" : "Grand total"}</span>
            <span className="text-[15px] font-black tabular-nums">
              {yen(grand)}
              {grandUsd != null && <span className="ml-3 text-[12px] font-semibold opacity-90">≈ {money(grandUsd, "USD", lang)}</span>}
            </span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-[1fr_15rem] items-end gap-6 [break-inside:avoid]">
          <p className="text-[10.5px] leading-relaxed text-slate-500">
            {lang === "ja"
              ? "本明細はオークション落札価格および日本国内の諸費用の実額を示すものです。海上運賃・保険料は含まれません。"
              : "This breakdown shows the actual auction purchase price and in-Japan costs for each vehicle. Ocean freight and insurance are not included."}
          </p>
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s?.stamp_url || "/brand/stamp.png"} alt="" className="mx-auto h-[54px] w-auto object-contain" />
            <div className="mt-1 border-t border-slate-400 pt-1 text-[10px] uppercase tracking-wider text-slate-500">{t("inv_authorized")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
