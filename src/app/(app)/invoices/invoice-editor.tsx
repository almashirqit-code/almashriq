"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, Plus, Trash2, Search } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { convert, money, round, vehicleTitle, num } from "@/lib/format";
import { CURRENCIES, INCOTERMS, INCOTERM_LABEL, SHIPMENT_TYPES, hasFreight, hasInsurance, type Currency, type Customer, type ShipmentType, type Vehicle } from "@/lib/types";
import { saveInvoice, type InvoicePayload } from "./actions";

export type VehicleOption = Pick<
  Vehicle,
  "id" | "stock_no" | "chassis_no" | "make" | "model" | "grade" | "year" | "color" | "mileage" | "engine_cc" | "transmission" | "fuel" | "price" | "price_currency" | "status"
> & { port?: { name: string; shipment_modes: string[] } | null };

type Line = { key: string; vehicle_id: string | null; description: string; quantity: number; unit_price: number };

let seq = 0;
const newKey = () => `l${++seq}`;

export function InvoiceEditor({
  customers,
  vehicles,
  rates,
  defaults,
  initial,
  addVehicleId,
  addVehiclePrice,
}: {
  customers: Pick<
    Customer,
    "id" | "name" | "company" | "country" | "port" | "address" | "phone" | "email" | "consignee_name" | "consignee_address" | "consignee_phone" | "notify_party"
  >[];
  vehicles: VehicleOption[];
  rates: Record<Currency, number>;
  defaults: { currency: Currency; tax_rate: number };
  initial?: Partial<InvoicePayload> & { id?: string; items?: InvoicePayload["items"] };
  /** Pre-adds this vehicle (from the stock list "Create invoice" action). */
  addVehicleId?: string;
  /** Unit price for the pre-added vehicle (e.g. from a reservation). */
  addVehiclePrice?: number;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const initialCurrency = initial?.currency ?? defaults.currency;

  const [customerId, setCustomerId] = useState(initial?.customer_id ?? "");
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? today);
  const [dueDate, setDueDate] = useState(initial?.due_date ?? in7);
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [rate, setRate] = useState<number>(initial?.exchange_rate ?? rates[initialCurrency] ?? 1);
  const [incoterm, setIncoterm] = useState(INCOTERMS.includes(initial?.incoterm ?? "") ? (initial?.incoterm as string) : "FOB");
  const [freight, setFreight] = useState<number>(initial?.freight ?? 0);
  const [insurance, setInsurance] = useState<number>(initial?.insurance ?? 0);
  const [shipmentType, setShipmentType] = useState<ShipmentType | "">(initial?.shipment_type ?? "");
  const [pol, setPol] = useState(initial?.port_of_loading ?? "");
  const [pod, setPod] = useState(initial?.port_of_discharge ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [consignee, setConsignee] = useState(() => {
    const has = initial?.consignee_name || initial?.consignee_address || initial?.consignee_phone || initial?.notify_party;
    if (has) {
      return {
        name: initial?.consignee_name ?? "",
        address: initial?.consignee_address ?? "",
        phone: initial?.consignee_phone ?? "",
        notify: initial?.notify_party ?? "",
      };
    }
    const c = customers.find((x) => x.id === initial?.customer_id);
    return c ? consigneeFrom(c) : { name: "", address: "", phone: "", notify: "" };
  });
  const [discount, setDiscount] = useState<number>(initial?.discount ?? 0);
  const [taxRate, setTaxRate] = useState<number>(initial?.tax_rate ?? defaults.tax_rate);
  const [lines, setLines] = useState<Line[]>(
    (initial?.items ?? []).map((it) => ({ key: newKey(), ...it }))
  );
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const usedIds = new Set(lines.map((l) => l.vehicle_id).filter(Boolean));

  const results = useMemo(() => {
    const s = search.trim().toLowerCase();
    return vehicles
      .filter((v) => !usedIds.has(v.id))
      .filter(
        (v) =>
          !s ||
          [v.stock_no, v.chassis_no, v.make, v.model, v.grade, v.year, v.color]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(s)
      )
      .slice(0, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, vehicles, lines]);

  const effectiveRates = { ...rates, [currency]: rate } as Record<Currency, number>;

  function describe(v: VehicleOption) {
    const specs = [
      v.chassis_no && `Chassis: ${v.chassis_no}`,
      `Stock: ${v.stock_no}`,
      v.color,
      v.mileage != null && `${num(v.mileage)} km`,
      v.engine_cc && `${v.engine_cc}cc`,
      v.transmission,
      v.fuel,
    ].filter(Boolean);
    return `${vehicleTitle(v)}\n${specs.join(" · ")}`;
  }

  function addVehicle(v: VehicleOption, priceOverride?: number) {
    const price =
      priceOverride != null ? priceOverride : v.price != null ? convert(Number(v.price), v.price_currency, currency, effectiveRates) : 0;
    setLines((ls) => [...ls, { key: newKey(), vehicle_id: v.id, description: describe(v), quantity: 1, unit_price: price }]);
    if (!pol && v.port?.name) setPol(`${v.port.name}, Japan`);
    if (v.port && !v.port.shipment_modes.includes("roro") && shipmentType === "") setShipmentType("container_20");
    setSearch("");
    setShowSearch(false);
  }

  // Opened from a vehicle's "Create invoice" action: add it once.
  const autoAdded = useRef(false);
  useEffect(() => {
    if (autoAdded.current || !addVehicleId) return;
    autoAdded.current = true;
    const v = vehicleMap.get(addVehicleId);
    if (v && !usedIds.has(v.id)) addVehicle(v, addVehiclePrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addVehicleId]);

  function addCharge(desc = "") {
    setLines((ls) => [...ls, { key: newKey(), vehicle_id: null, description: desc, quantity: 1, unit_price: 0 }]);
  }

  function update(key: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function changeCurrency(next: Currency) {
    const nextRate = next === "JPY" ? 1 : rates[next] || 1;
    const fromRate = currency === "JPY" ? 1 : Number(rate) || 1;
    const conv = (x: number) => round((Number(x) || 0) * (fromRate / nextRate), next);
    setLines((ls) => ls.map((l) => ({ ...l, unit_price: conv(l.unit_price) })));
    setDiscount((d) => conv(d));
    setFreight((x) => conv(x));
    setInsurance((x) => conv(x));
    setCurrency(next);
    setRate(nextRate);
  }

  const subtotal = round(lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0), currency);
  const tax = round(((subtotal - (Number(discount) || 0)) * (Number(taxRate) || 0)) / 100, currency);
  // Container-only ports (e.g. NS Kyushu) can't ship RoRo.
  const roroBlocked =
    shipmentType === "roro"
      ? lines
          .map((l) => (l.vehicle_id ? vehicleMap.get(l.vehicle_id) : undefined))
          .filter((v): v is VehicleOption => !!v && !!v.port && !v.port.shipment_modes.includes("roro"))
      : [];

  const freightAmt = hasFreight(incoterm) ? Number(freight) || 0 : 0;
  const insuranceAmt = hasInsurance(incoterm) ? Number(insurance) || 0 : 0;
  const fobTotal = round(subtotal - (Number(discount) || 0), currency);
  const total = round(fobTotal + freightAmt + insuranceAmt + tax, currency);

  function submit(issue: boolean) {
    setError("");
    if (!customerId) return setError(t("inv_no_customer"));
    if (!lines.some((l) => l.description.trim())) return setError(t("inv_no_items"));
    if (roroBlocked.length) return setError(t("m_roro_blocked", { stock: roroBlocked[0].stock_no, port: roroBlocked[0].port!.name }));
    const payload: InvoicePayload = {
      id: initial?.id,
      customer_id: customerId,
      issue_date: issueDate,
      due_date: dueDate || null,
      currency,
      exchange_rate: currency === "JPY" ? 1 : Number(rate) || 1,
      incoterm,
      port_of_loading: pol || null,
      port_of_discharge: pod || null,
      consignee_name: consignee.name || null,
      consignee_address: consignee.address || null,
      consignee_phone: consignee.phone || null,
      notify_party: consignee.notify || null,
      notes: notes || null,
      discount: Number(discount) || 0,
      freight: freightAmt,
      insurance: insuranceAmt,
      shipment_type: shipmentType || null,
      tax_rate: Number(taxRate) || 0,
      items: lines.map(({ vehicle_id, description, quantity, unit_price }) => ({ vehicle_id, description, quantity, unit_price })),
      issue,
      reservation_id: initial?.reservation_id ?? null,
    };
    start(async () => {
      const res = await saveInvoice(payload);
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/invoices/${res.id}`);
    });
  }

  const customer = customers.find((c) => c.id === customerId);

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="label">{t("inv_customer")} *</label>
            <div className="flex gap-2">
              <select
                className="input"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  const c = customers.find((x) => x.id === e.target.value);
                  if (c?.port && !pod) setPod(c.port);
                  if (c) setConsignee(consigneeFrom(c));
                }}
              >
                <option value="">{t("inv_select_customer")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` — ${c.company}` : ""}
                    {c.country ? ` (${c.country})` : ""}
                  </option>
                ))}
              </select>
              <Link href="/customers/new?return_to=/invoices/new" className="btn-secondary shrink-0" title={t("cust_new")}>
                <Plus className="h-4 w-4" />
              </Link>
            </div>
            {customer && <p className="mt-1 text-xs text-slate-500">{[customer.company, customer.country, customer.port].filter(Boolean).join(" · ")}</p>}
          </div>
          <div>
            <label className="label">{t("inv_issue_date")}</label>
            <input type="date" className="input" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("inv_due_date")}</label>
            <input type="date" className="input" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("inv_currency")}</label>
            <select className="input" value={currency} onChange={(e) => changeCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("inv_rate", { cur: currency })}</label>
            <input
              type="number"
              step="any"
              min="0"
              className="input"
              value={currency === "JPY" ? 1 : rate}
              disabled={currency === "JPY"}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">{t("inv_incoterm")}</label>
            <select className="input" value={incoterm} onChange={(e) => setIncoterm(e.target.value)}>
              {INCOTERMS.map((i) => (
                <option key={i} value={i}>
                  {INCOTERM_LABEL[i]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("inv_shipment")}</label>
            <select className="input" value={shipmentType} onChange={(e) => setShipmentType(e.target.value as ShipmentType | "")}>
              <option value="">{t("inv_select_shipment")}</option>
              {SHIPMENT_TYPES.map((s) => (
                <option key={s} value={s}>
                  {t(`ship_${s}` as DictKey)}
                </option>
              ))}
            </select>
            {roroBlocked.map((v) => (
              <p key={v.id} className="mt-1 text-xs font-medium text-amber-700">
                ⚠ {t("m_roro_blocked", { stock: v.stock_no, port: v.port!.name })}
              </p>
            ))}
          </div>
          <div className="md:col-span-2">
            <label className="label">{t("inv_pol")}</label>
            <input className="input" value={pol ?? ""} onChange={(e) => setPol(e.target.value)} placeholder="Yokohama, Japan" />
          </div>
          <div className="md:col-span-2">
            <label className="label">{t("inv_pod")}</label>
            <input className="input" value={pod ?? ""} onChange={(e) => setPod(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">{t("inv_consignee")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("inv_consignee_help")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <label className="label">{t("c_consignee_name")}</label>
            <input className="input" value={consignee.name} onChange={(e) => setConsignee({ ...consignee, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("c_consignee_phone")}</label>
            <input className="input" value={consignee.phone} onChange={(e) => setConsignee({ ...consignee, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("c_consignee_address")}</label>
            <textarea
              className="input"
              rows={2}
              value={consignee.address}
              onChange={(e) => setConsignee({ ...consignee, address: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{t("c_notify_party")}</label>
            <textarea
              className="input"
              rows={2}
              value={consignee.notify}
              onChange={(e) => setConsignee({ ...consignee, notify: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold">{t("inv_items")}</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowSearch((s) => !s)}>
              <Car className="h-4 w-4" />
              {t("inv_add_vehicle")}
            </button>
            <select
              className="input w-auto"
              value=""
              onChange={(e) => {
                if (e.target.value === "__custom") addCharge();
                else if (e.target.value) addCharge(e.target.value);
              }}
            >
              <option value="">+ {t("inv_add_charge")}</option>
              <option value={t("inv_charge_inspection")}>{t("inv_charge_inspection")}</option>
              <option value="__custom">…</option>
            </select>
          </div>
        </div>

        {showSearch && (
          <div className="border-b border-slate-100 bg-slate-50 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                autoFocus
                className="input pl-9"
                placeholder={t("inv_search_vehicle")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200 bg-white">
              {results.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">{t("no_results")}</li>}
              {results.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50"
                    onClick={() => addVehicle(v)}
                  >
                    <span>
                      <span className="font-medium">{v.stock_no}</span> · {vehicleTitle(v)}
                      <span className="block text-xs text-slate-500">
                        {v.chassis_no} {v.status === "reserved" && "· " + t("vs_reserved")}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {v.price != null ? money(v.price, v.price_currency, locale) : "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t("inv_description")}</th>
                <th className="w-24 text-right">{t("inv_qty")}</th>
                <th className="w-40 text-right">{t("inv_unit_price")}</th>
                <th className="w-36 text-right">{t("amount")}</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    {t("inv_no_items")}
                  </td>
                </tr>
              )}
              {lines.map((l) => {
                const v = l.vehicle_id ? vehicleMap.get(l.vehicle_id) : null;
                return (
                  <tr key={l.key} className="align-top">
                    <td>
                      {v && (
                        <div className="mb-1 inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                          <Car className="h-3 w-3" /> {v.stock_no}
                        </div>
                      )}
                      <textarea
                        className="input min-h-[2.5rem]"
                        rows={l.description.includes("\n") ? 2 : 1}
                        value={l.description}
                        onChange={(e) => update(l.key, { description: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="input text-right"
                        value={l.quantity}
                        onChange={(e) => update(l.key, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="input text-right"
                        value={l.unit_price}
                        onChange={(e) => update(l.key, { unit_price: Number(e.target.value) })}
                      />
                    </td>
                    <td className="pt-5 text-right tabular-nums">
                      {money((Number(l.quantity) || 0) * (Number(l.unit_price) || 0), currency, locale)}
                    </td>
                    <td className="pt-4">
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        aria-label={t("delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-slate-100 p-5 md:grid-cols-2">
          <div>
            <label className="label">{t("notes")}</label>
            <textarea className="input" rows={4} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2 text-sm">
            <Row label={t("inv_subtotal")} value={money(subtotal, currency, locale)} />
            <Row
              label={t("inv_discount")}
              value={
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input w-36 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              }
            />
            <Row
              label={t("inv_tax_rate")}
              value={
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="input w-36 text-right"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              }
            />
            {tax > 0 && <Row label={t("inv_tax")} value={money(tax, currency, locale)} />}
            <Row label={`${t("inv_total_fob")}`} value={money(fobTotal, currency, locale)} />
            {hasFreight(incoterm) ? (
              <Row
                label={`${t("inv_freight")}${shipmentType ? ` (${t(`ship_${shipmentType}` as DictKey)})` : ""}`}
                value={
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input w-36 text-right"
                    value={freight}
                    onChange={(e) => setFreight(Number(e.target.value))}
                  />
                }
              />
            ) : (
              <p className="text-right text-xs text-slate-400">{t("inv_freight_help")}</p>
            )}
            {hasInsurance(incoterm) && (
              <Row
                label={t("inv_insurance")}
                value={
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input w-36 text-right"
                    value={insurance}
                    onChange={(e) => setInsurance(Number(e.target.value))}
                  />
                }
              />
            )}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold">
              <span>
                {t("inv_total")} {INCOTERM_LABEL[incoterm]}
              </span>
              <span className="tabular-nums">{money(total, currency, locale)}</span>
            </div>
            {currency !== "JPY" && (
              <div className="text-right text-xs text-slate-500">≈ {money(total * (Number(rate) || 0), "JPY", locale)}</div>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-secondary" disabled={pending} onClick={() => submit(false)}>
          {pending ? t("saving") : t("inv_save_draft")}
        </button>
        <button className="btn-primary" disabled={pending} onClick={() => submit(true)}>
          {t("inv_issue")}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

/** Customer's saved consignee, falling back to the customer's own details. */
function consigneeFrom(c: {
  name: string;
  company: string | null;
  address: string | null;
  country: string | null;
  phone: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  consignee_phone: string | null;
  notify_party: string | null;
}) {
  return {
    name: c.consignee_name ?? [c.name, c.company].filter(Boolean).join(" / "),
    address: c.consignee_address ?? [c.address, c.country].filter(Boolean).join("\n"),
    phone: c.consignee_phone ?? c.phone ?? "",
    notify: c.notify_party ?? "",
  };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
