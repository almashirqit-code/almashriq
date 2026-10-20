"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, Gavel, Warehouse, Anchor, Ship, TrendingUp, TrendingDown, User, BadgeCheck, Info, Search } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { convert, money, num, publicImageUrl, round, vehicleTitle } from "@/lib/format";
import {
  CURRENCIES,
  INCOTERMS,
  INCOTERM_LABEL,
  SHIPMENT_TYPES,
  hasFreight,
  hasInsurance,
  type Currency,
  type FreightRate,
  type ShipmentType,
} from "@/lib/types";
import { IconChip } from "@/components/ui";
import type { ReserveVehicle } from "./data";
import { saveReservation, type ReservationPayload } from "./actions";

type Customer = { id: string; customer_no: number; name: string; company: string | null; country: string | null; port: string | null };
type Agent = { id: string; full_name: string | null; email: string; role: string };

export function ReservationForm({
  vehicle,
  customers,
  agents,
  freightRates,
  rates,
  defaultCurrency,
  meId,
  seeCost,
  initial,
}: {
  vehicle: ReserveVehicle;
  customers: Customer[];
  agents: Agent[];
  freightRates: FreightRate[];
  rates: Record<Currency, number>;
  defaultCurrency: Currency;
  meId: string;
  seeCost: boolean;
  initial?: Partial<ReservationPayload> & { id?: string };
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const port = vehicle.port;
  const roroBlocked = !!port && !port.shipment_modes.includes("roro");

  const [customerId, setCustomerId] = useState(initial?.customer_id ?? "");
  const [custQ, setCustQ] = useState("");
  const [agentId, setAgentId] = useState(initial?.sales_agent_id ?? meId);
  const [term, setTerm] = useState(initial?.price_term ?? "CNF");
  const [shipment, setShipment] = useState<ShipmentType | "">(initial?.shipment_type ?? (roroBlocked ? "container_20" : "roro"));
  const [pol, setPol] = useState(initial?.port_of_loading ?? (port ? `${port.name}, Japan` : ""));
  const [pod, setPod] = useState(initial?.port_of_discharge ?? "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? defaultCurrency);
  const [fx, setFx] = useState<number>(initial?.exchange_rate ?? rates[initial?.currency ?? defaultCurrency] ?? 1);
  const [rateId, setRateId] = useState<string>(initial?.freight_rate_id ?? "");
  const [freight, setFreight] = useState<number>(initial?.freight ?? 0);
  const [insurance, setInsurance] = useState<number>(initial?.insurance ?? 0);
  const [sold, setSold] = useState<number>(initial?.sold_price ?? 0);
  const [until, setUntil] = useState(initial?.reserved_until ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const customer = customers.find((c) => c.id === customerId);
  const fxRates = { ...rates, [currency]: currency === "JPY" ? 1 : fx } as Record<Currency, number>;
  const withFreight = hasFreight(term);

  // Default destination = the customer's port.
  useEffect(() => {
    if (customer?.port && !pod) setPod(customer.port);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Saved rates matching this route: same destination + shipment, this port or "any port".
  const matches = useMemo(() => {
    const dest = pod.trim().toLowerCase().split(",")[0].trim();
    return freightRates
      .filter((r) => (!shipment || r.shipment_type === shipment) && (!r.port_id || !port || r.port_id === port.id))
      .filter((r) => !dest || r.destination.toLowerCase().includes(dest) || dest.includes(r.destination.toLowerCase()))
      .sort((a, b) => Number(!!b.port_id) - Number(!!a.port_id));
  }, [freightRates, pod, shipment, port]);

  const applyRate = (r: FreightRate | undefined) => {
    setRateId(r?.id ?? "");
    if (r) setFreight(convert(Number(r.amount), r.currency, currency, fxRates));
  };

  // Auto-pick the best saved rate when the route changes (not on first load of an existing reservation).
  const firstRun = useRef(!!initial?.id);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!withFreight || !pod.trim()) return;
    const exact = matches.find((r) => r.destination.toLowerCase() === pod.trim().toLowerCase().split(",")[0].trim()) ?? matches[0];
    if (exact) applyRate(exact);
    else setRateId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod, shipment, withFreight]);

  // Keep the freight in the reservation currency when the currency changes.
  const prevCur = useRef(currency);
  useEffect(() => {
    if (prevCur.current === currency) return;
    const from = prevCur.current;
    prevCur.current = currency;
    const newFx = currency === "JPY" ? 1 : rates[currency] ?? 1;
    setFx(newFx);
    const r2 = { ...rates, [currency]: newFx } as Record<Currency, number>;
    setFreight((f) => convert(f, from, currency, r2));
    setInsurance((f) => convert(f, from, currency, r2));
    setSold((s) => convert(s, from, currency, r2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  // Suggested price from the vehicle's list price.
  const listPrice = vehicle.price != null ? convert(Number(vehicle.price), vehicle.price_currency, currency, fxRates) : null;

  // Profit (JPY)
  const rateJ = currency === "JPY" ? 1 : fx || 0;
  const soldJ = Math.round((sold || 0) * rateJ);
  const freightJ = Math.round(((withFreight ? freight : 0) + (hasInsurance(term) ? insurance : 0)) * rateJ);
  const cost = vehicle.cost.total;
  const profit = soldJ - freightJ - cost;
  const margin = soldJ ? (profit / soldJ) * 100 : 0;
  const yen = (n: number) => money(n, "JPY", locale);

  const filteredCustomers = useMemo(() => {
    const s = custQ.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => `${c.customer_no} ${c.name} ${c.company ?? ""} ${c.country ?? ""}`.toLowerCase().includes(s) || c.id === customerId);
  }, [custQ, customers, customerId]);

  function submit() {
    setError("");
    start(async () => {
      const res = await saveReservation({
        id: initial?.id,
        vehicle_id: vehicle.id,
        customer_id: customerId,
        sales_agent_id: agentId || null,
        price_term: term,
        shipment_type: shipment || null,
        port_of_loading: pol,
        port_of_discharge: pod,
        freight_rate_id: rateId || null,
        currency,
        exchange_rate: rateJ,
        sold_price: sold,
        freight: withFreight ? freight : 0,
        insurance: hasInsurance(term) ? insurance : 0,
        reserved_until: until || null,
        notes,
      });
      if (res.error) {
        setError(res.error.startsWith("rv_") ? t(res.error as DictKey) : res.error);
        return;
      }
      router.push(`/reservations/${res.id}`);
      router.refresh();
    });
  }

  const seg = (active: boolean, disabled = false) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      disabled
        ? "cursor-not-allowed text-slate-300 line-through"
        : active
          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* ---------- Left: vehicle, origin, cost ---------- */}
      <div className="space-y-5">
        <section className="card overflow-hidden">
          <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200">
            {vehicle.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicImageUrl(vehicle.image)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                <Car className="h-12 w-12" />
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-brand-700 shadow">{vehicle.stock_no}</span>
          </div>
          <div className="p-5">
            <div className="text-lg font-bold text-slate-900">{vehicleTitle(vehicle)}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {[vehicle.chassis_no, vehicle.color, vehicle.mileage != null ? `${num(vehicle.mileage, locale)} km` : null].filter(Boolean).join(" · ")}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <IconChip tone="cyan" size="sm">
                <Anchor />
              </IconChip>
              {t("rv_origin")}
            </h2>
          </div>
          <dl className="divide-y divide-slate-100 text-sm">
            <Row icon={<Gavel className="h-4 w-4 text-violet-500" />} label={t("rv_auction")} value={vehicle.auction?.name} />
            <Row icon={<Warehouse className="h-4 w-4 text-amber-500" />} label={t("rv_yard")} value={vehicle.yard ? [vehicle.yard.name, vehicle.yard.address].filter(Boolean).join(" — ") : null} />
            <Row
              icon={<Anchor className="h-4 w-4 text-cyan-500" />}
              label={t("rv_port")}
              value={
                port ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {port.name}
                    {port.shipment_modes.map((m) => (
                      <span key={m} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-600/20">
                        {t(`m_mode_${m}` as DictKey)}
                      </span>
                    ))}
                  </span>
                ) : null
              }
            />
          </dl>
        </section>

        {seeCost ? (
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                <IconChip tone="violet" size="sm">
                  <Car />
                </IconChip>
                {t("rv_total_cost")}
              </h2>
            </div>
            <dl className="space-y-2 p-5 text-sm">
              {vehicle.ownership === "third_party" ? (
                <Line label={`${t("rv_supplier")}${vehicle.supplier_name ? ` (${vehicle.supplier_name})` : ""}`} value={yen(vehicle.cost.supplier)} />
              ) : (
                <>
                  <Line label={t("rv_buying")} value={yen(vehicle.cost.buying)} />
                  <Line label={t("rv_tax")} value={yen(vehicle.cost.tax)} />
                </>
              )}
              <Line label={t("rv_expenses")} value={yen(vehicle.cost.expenses)} />
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 font-bold text-slate-900">
                <span>{t("rv_total_cost")}</span>
                <span className="tabular-nums">{yen(cost)}</span>
              </div>
              {vehicle.fob_usd != null && (
                <div className="text-right text-xs text-slate-500">≈ FOB {money(Number(vehicle.fob_usd), "USD", locale)}</div>
              )}
            </dl>
          </section>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
            <Info className="h-4 w-4" />
            {t("rv_cost_hidden")}
          </p>
        )}
      </div>

      {/* ---------- Middle: the deal ---------- */}
      <div className="space-y-5 xl:col-span-2">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <IconChip tone="sky" size="sm">
                <User />
              </IconChip>
              {t("rv_customer")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">{t("rv_customer")} *</label>
              <div className="flex gap-2">
                <div className="relative w-44 shrink-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9" placeholder={t("search")} value={custQ} onChange={(e) => setCustQ(e.target.value)} />
                </div>
                <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">{t("rv_pick_customer")}</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_no} · {c.name}
                      {c.company ? ` (${c.company})` : ""}
                      {c.country ? ` — ${c.country}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">{t("rv_agent")}</label>
              <select className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("rv_reserved_until")}</label>
              <input type="date" className="input" value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <IconChip tone="fuchsia" size="sm">
                <Ship />
              </IconChip>
              {t("rv_price_term")} & {t("rv_shipment")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div>
              <label className="label">{t("rv_price_term")}</label>
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {INCOTERMS.map((i) => (
                  <button key={i} type="button" className={seg(term === i)} onClick={() => setTerm(i)}>
                    {INCOTERM_LABEL[i]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t("rv_shipment")}</label>
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {SHIPMENT_TYPES.map((s) => {
                  const disabled = s === "roro" && roroBlocked;
                  return (
                    <button key={s} type="button" disabled={disabled} className={seg(shipment === s, disabled)} onClick={() => setShipment(s)} title={disabled ? t("m_container_only") : undefined}>
                      {t(`ship_${s}` as DictKey)}
                    </button>
                  );
                })}
              </div>
              {roroBlocked && <p className="mt-1.5 text-xs text-amber-700">{port?.name} · {t("m_container_only")}</p>}
            </div>
            <div>
              <label className="label">{t("rv_pol")}</label>
              <input className="input" value={pol} onChange={(e) => setPol(e.target.value)} />
            </div>
            <div>
              <label className="label">{t("rv_pod")}</label>
              <input className="input" value={pod} onChange={(e) => setPod(e.target.value)} placeholder="Karachi" />
            </div>

            {withFreight && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 md:col-span-2">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="label">{t("rv_freight_rate")}</label>
                    <select
                      className="input"
                      value={rateId}
                      onChange={(e) => applyRate(freightRates.find((r) => r.id === e.target.value))}
                    >
                      <option value="">{t("rv_pick_rate")}</option>
                      {matches.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.destination}
                          {r.country ? `, ${r.country}` : ""} · {t(`ship_${r.shipment_type}` as DictKey)} · {money(Number(r.amount), r.currency, locale)}
                          {r.port_id ? "" : ` · ${t("fr_any_port")}`}
                        </option>
                      ))}
                    </select>
                    {matches.length === 0 && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        {t("rv_no_rate")}{" "}
                        <Link href="/freight" className="font-semibold text-sky-700 underline" target="_blank">
                          {t("nav_freight")}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">
                      {t("rv_freight")} ({currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      className="input text-right"
                      value={freight}
                      onChange={(e) => {
                        setFreight(Number(e.target.value));
                        setRateId("");
                      }}
                    />
                  </div>
                  {hasInsurance(term) && (
                    <div className="md:col-start-3">
                      <label className="label">
                        {t("rv_insurance")} ({currency})
                      </label>
                      <input type="number" min={0} step="any" className="input text-right" value={insurance} onChange={(e) => setInsurance(Number(e.target.value))} />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">{t("rv_freight_note")}</p>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <IconChip tone="emerald" size="sm">
                <BadgeCheck />
              </IconChip>
              {t("rv_sold_price")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t("rv_currency")}</label>
                  <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t("rv_rate", { currency })}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="input text-right"
                    disabled={currency === "JPY"}
                    value={currency === "JPY" ? 1 : fx}
                    onChange={(e) => setFx(Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="label">
                  {t("rv_sold_price")} ({currency}) *
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="input py-3 text-right text-xl font-bold"
                  value={sold || ""}
                  onChange={(e) => setSold(Number(e.target.value))}
                  placeholder="0"
                />
                <p className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{withFreight ? t("rv_sold_hint_cnf") : t("rv_sold_hint_fob")}</span>
                  {listPrice != null && (
                    <button
                      type="button"
                      className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                      onClick={() => setSold(round(listPrice + (withFreight ? freight : 0) + (hasInsurance(term) ? insurance : 0), currency))}
                    >
                      {t("f_price")}: {money(listPrice, currency, locale)}
                      {withFreight ? ` + ${t("rv_freight")}` : ""}
                    </button>
                  )}
                </p>
              </div>
              <div>
                <label className="label">{t("rv_notes")}</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            {seeCost && (
              <div
                className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${
                  profit >= 0 ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20" : "bg-gradient-to-br from-rose-500 to-brand-700 shadow-brand-500/20"
                }`}
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
                <div className="relative text-xs font-semibold uppercase tracking-wider text-white/80">{t("rv_breakdown")}</div>
                <dl className="relative mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/85">{t("rv_sold_jpy")}</span>
                    <span className="tabular-nums">{yen(soldJ)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/85">{t("rv_less_freight")}</span>
                    <span className="tabular-nums">−{yen(freightJ)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/85">{t("rv_less_cost")}</span>
                    <span className="tabular-nums">−{yen(cost)}</span>
                  </div>
                </dl>
                <div className="relative mt-3 border-t border-white/25 pt-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                    {profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {t("rv_profit")}
                  </div>
                  <div className="mt-1 text-3xl font-bold tabular-nums">{yen(profit)}</div>
                  <div className="mt-0.5 text-sm text-white/85">
                    {currency !== "JPY" && rateJ > 0 && <>≈ {money(round(profit / rateJ, currency), currency, locale)} · </>}
                    {t("rv_margin")} {margin.toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            {t("cancel")}
          </button>
          <button type="button" className="btn-primary px-6" disabled={pending} onClick={submit}>
            <BadgeCheck className="h-4 w-4" />
            {pending ? t("saving") : t("rv_save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="mt-0.5">{icon}</span>
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-slate-800">{value || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular-nums text-slate-800">{value}</span>
    </div>
  );
}
