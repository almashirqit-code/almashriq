"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ship, Package, Upload, FileText, Download, X, Check, CalendarClock, Anchor, FileCheck2, PackageCheck, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { DOC_ACCEPT } from "@/lib/remittance-docs";
import { uploadVehicleDocs } from "@/lib/vehicle-docs";
import {
  COURIER_DOC_KINDS,
  CURRENCIES,
  SHIPMENT_TYPES,
  SHIPPING_DOC_KINDS,
  SHIPPING_STATUSES,
  type Currency,
  type ShipmentType,
  type ShippingStatus,
  type VehicleDocKind,
  type VehicleDocument,
  type VehicleShipment,
} from "@/lib/types";
import { IconChip } from "@/components/ui";
import { saveShipment, deleteVehicleDoc, refreshShipping, type ShipmentInput } from "./actions";

const SHIP_COMPANIES = ["MSC", "Maersk", "CMA CGM", "ONE", "Evergreen", "Hapag-Lloyd", "COSCO", "Yang Ming", "HMM", "ZIM", "NYK", "MOL", "K Line", "Hoegh Autoliners", "Wallenius Wilhelmsen", "Glovis", "EUKOR", "Toyofuji"];
const COURIERS = ["DHL", "FedEx", "EMS (Japan Post)", "UPS", "OCS", "Aramex"];

const STEP_ICON: Record<ShippingStatus, React.ElementType> = {
  not_booked: CalendarClock,
  booked: Anchor,
  shipped: Ship,
  delivered: PackageCheck,
};
const STEP_GRAD: Record<ShippingStatus, string> = {
  not_booked: "from-slate-400 to-slate-500",
  booked: "from-sky-400 to-blue-600",
  shipped: "from-violet-500 to-indigo-600",
  delivered: "from-emerald-400 to-teal-600",
};
/** Documents that move the shipping status — highlighted on the cards. */
const KEY_DOCS: Partial<Record<VehicleDocKind, ShippingStatus>> = { bl: "shipped", waybill: "delivered", surrender: "delivered" };

type Suggestions = Record<"ship_company" | "forwarding_agent" | "courier_service" | "courier_company", string[]>;

export function ShippingEditor({
  vehicleId,
  status,
  shipment,
  docs,
  defaults,
  suggestions,
  initialTab,
  canEdit,
}: {
  vehicleId: string;
  status: ShippingStatus;
  shipment: VehicleShipment | null;
  docs: VehicleDocument[];
  defaults: { port_of_loading: string | null; place_of_delivery: string | null; shipment_type: ShipmentType | null };
  suggestions: Suggestions;
  initialTab: "shipping" | "courier";
  canEdit: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const s = shipment;

  const [f, setF] = useState<ShipmentInput>({
    ship_company: s?.ship_company ?? "",
    vessel_name: s?.vessel_name ?? "",
    voyage_no: s?.voyage_no ?? "",
    etd: s?.etd ?? "",
    eta: s?.eta ?? "",
    port_of_loading: s?.port_of_loading ?? defaults.port_of_loading ?? "",
    place_of_delivery: s?.place_of_delivery ?? defaults.place_of_delivery ?? "",
    forwarding_agent: s?.forwarding_agent ?? "",
    cut_off_date: s?.cut_off_date ?? "",
    bl_no: s?.bl_no ?? "",
    bl_date: s?.bl_date ?? "",
    booking_no: s?.booking_no ?? "",
    track_url: s?.track_url ?? "",
    shipment_type: s?.shipment_type ?? defaults.shipment_type ?? "",
    container_no: s?.container_no ?? "",
    freight_charges: s?.freight_charges ?? "",
    freight_currency: s?.freight_currency ?? "USD",
    vanning_charges: s?.vanning_charges ?? "",
    ship_invoice_details: s?.ship_invoice_details ?? "",
    courier_service: s?.courier_service ?? "",
    courier_company: s?.courier_company ?? "",
    courier_tracking: s?.courier_tracking ?? "",
    courier_date: s?.courier_date ?? "",
    courier_details: s?.courier_details ?? "",
    courier_charges: s?.courier_charges ?? "",
  });
  const set = (k: keyof ShipmentInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  const SHIP_KEYS: (keyof ShipmentInput)[] = [
    "ship_company", "vessel_name", "voyage_no", "etd", "eta", "port_of_loading", "place_of_delivery", "forwarding_agent", "cut_off_date",
    "bl_no", "bl_date", "booking_no", "track_url", "shipment_type", "container_no", "freight_charges", "freight_currency", "vanning_charges",
    "ship_invoice_details",
  ];
  const COURIER_KEYS: (keyof ShipmentInput)[] = ["courier_service", "courier_company", "courier_tracking", "courier_date", "courier_details", "courier_charges"];

  function save() {
    setMsg(null);
    const keys = tab === "shipping" ? SHIP_KEYS : COURIER_KEYS;
    const part = Object.fromEntries(keys.map((k) => [k, f[k]])) as ShipmentInput;
    start(async () => {
      const r = await saveShipment(vehicleId, part);
      if (r.error) return setMsg({ text: r.error });
      setMsg({ ok: true, text: t("sh_saved") });
      router.refresh();
    });
  }

  const field = (k: keyof ShipmentInput, label: DictKey, opts: { type?: string; list?: string; required?: boolean; placeholder?: string } = {}) => (
    <div>
      <label className="label">
        {t(label)}
        {opts.required && <span className="text-brand-600"> *</span>}
      </label>
      <input
        className="input"
        type={opts.type ?? "text"}
        list={opts.list}
        value={String(f[k] ?? "")}
        onChange={set(k)}
        disabled={!canEdit}
        placeholder={opts.placeholder}
        step={opts.type === "number" ? "any" : undefined}
        min={opts.type === "number" ? 0 : undefined}
      />
    </div>
  );

  const idx = SHIPPING_STATUSES.indexOf(status);

  return (
    <div className="space-y-5">
      {/* Status stepper */}
      <section className="card p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SHIPPING_STATUSES.map((st, i) => {
            const Icon = STEP_ICON[st];
            const done = i <= idx;
            return (
              <div
                key={st}
                className={`flex items-center gap-3 rounded-xl p-3 ring-1 transition ${
                  i === idx ? "bg-white shadow-md ring-slate-200" : done ? "bg-slate-50 ring-slate-100" : "bg-white/60 ring-slate-100"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                    done ? `bg-gradient-to-br shadow-lg ${STEP_GRAD[st]}` : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {done && i < idx ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className={`text-sm font-bold ${done ? "text-slate-900" : "text-slate-400"}`}>{t(`ss_${st}` as DictKey)}</div>
                  <div className="text-[11px] text-slate-400">{i + 1} / 4</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">{t(`ss_hint_${status}` as DictKey)}</p>
      </section>

      {/* Tabs */}
      <div className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {(
          [
            ["shipping", Ship, "sh_tab_shipping"],
            ["courier", Package, "sh_tab_courier"],
          ] as const
        ).map(([k, Icon, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              setMsg(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === k ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(label)}
          </button>
        ))}
      </div>

      <datalist id="dl-ship">{[...new Set([...suggestions.ship_company, ...SHIP_COMPANIES])].map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="dl-fwd">{suggestions.forwarding_agent.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="dl-courier">{[...new Set([...suggestions.courier_service, ...COURIERS])].map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="dl-courier-co">{suggestions.courier_company.map((x) => <option key={x} value={x} />)}</datalist>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">
            <IconChip tone={tab === "shipping" ? "sky" : "amber"} size="sm">
              {tab === "shipping" ? <Ship /> : <Package />}
            </IconChip>
            {t(tab === "shipping" ? "sh_tab_shipping" : "sh_tab_courier")}
          </h2>
          {s?.track_url && tab === "shipping" && (
            <a href={s.track_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline">
              {t("sh_track")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {tab === "shipping" ? (
            <>
              {field("ship_company", "sh_ship_company", { list: "dl-ship" })}
              {field("vessel_name", "sh_vessel")}
              {field("voyage_no", "sh_voyage")}
              {field("booking_no", "sh_booking", { required: true })}
              {field("etd", "sh_etd", { type: "date", required: true })}
              {field("eta", "sh_eta", { type: "date", required: true })}
              {field("cut_off_date", "sh_cutoff", { type: "date" })}
              <div>
                <label className="label">{t("sh_shipment_type")}</label>
                <select className="input" value={String(f.shipment_type ?? "")} onChange={set("shipment_type")} disabled={!canEdit}>
                  <option value="">—</option>
                  {SHIPMENT_TYPES.map((x) => (
                    <option key={x} value={x}>
                      {t(`ship_${x}` as DictKey)}
                    </option>
                  ))}
                </select>
              </div>
              {field("port_of_loading", "sh_pol")}
              {field("place_of_delivery", "sh_pod")}
              {field("forwarding_agent", "sh_forwarder", { list: "dl-fwd" })}
              {field("container_no", "sh_container")}
              {field("bl_no", "sh_bl_no")}
              {field("bl_date", "sh_bl_date", { type: "date" })}
              {field("track_url", "sh_track", { placeholder: "https://" })}
              <div>
                <label className="label">{t("sh_freight")}</label>
                <div className="flex gap-1.5">
                  <input className="input" type="number" min={0} step="any" value={String(f.freight_charges ?? "")} onChange={set("freight_charges")} disabled={!canEdit} />
                  <select className="input w-24" value={String(f.freight_currency)} onChange={set("freight_currency")} disabled={!canEdit}>
                    {CURRENCIES.map((c: Currency) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              {field("vanning_charges", "sh_vanning", { type: "number", placeholder: "¥" })}
              <div className="sm:col-span-2 xl:col-span-3">
                <label className="label">{t("sh_invoice_details")}</label>
                <textarea className="input" rows={2} value={String(f.ship_invoice_details ?? "")} onChange={set("ship_invoice_details")} disabled={!canEdit} />
              </div>
            </>
          ) : (
            <>
              {field("courier_service", "sh_courier_service", { list: "dl-courier" })}
              {field("courier_company", "sh_courier_company", { list: "dl-courier-co" })}
              {field("courier_tracking", "sh_courier_tracking")}
              {field("courier_date", "sh_courier_date", { type: "date" })}
              {field("courier_charges", "sh_courier_charges", { type: "number", placeholder: "¥" })}
              <div className="sm:col-span-2 xl:col-span-3">
                <label className="label">{t("sh_courier_details")}</label>
                <textarea className="input" rows={2} value={String(f.courier_details ?? "")} onChange={set("courier_details")} disabled={!canEdit} />
              </div>
            </>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
            {msg && <span className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
            <button type="button" className="btn-primary" disabled={pending} onClick={save}>
              <Check className="h-4 w-4" />
              {pending ? t("saving") : t("sh_save")}
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">
            <IconChip tone="violet" size="sm">
              <FileCheck2 />
            </IconChip>
            {t("sh_docs")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {(tab === "shipping" ? SHIPPING_DOC_KINDS : COURIER_DOC_KINDS).map((kind) => (
            <DocCard key={kind} vehicleId={vehicleId} kind={kind} docs={docs.filter((d) => d.kind === kind)} canEdit={canEdit} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DocCard({ vehicleId, kind, docs, canEdit }: { vehicleId: string; kind: VehicleDocKind; docs: VehicleDocument[]; canEdit: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const moves = KEY_DOCS[kind];
  const has = docs.length > 0;

  return (
    <div
      className={`flex flex-col rounded-xl border p-3 transition ${
        has ? "border-emerald-200 bg-emerald-50/40" : moves ? "border-dashed border-violet-300 bg-violet-50/30" : "border-dashed border-slate-200 bg-slate-50/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800">{t(`doc_${kind}` as DictKey)}</div>
          {moves && (
            <div className="mt-0.5 text-[11px] font-semibold text-violet-600">
              → {t(`ss_${moves}` as DictKey)}
            </div>
          )}
        </div>
        {canEdit && (
          <>
            <input
              ref={ref}
              type="file"
              multiple
              accept={DOC_ACCEPT}
              className="hidden"
              onChange={async (e) => {
                const files: File[] = Array.from(e.target.files ?? []);
                if (!files.length) return;
                setBusy(true);
                const failed = await uploadVehicleDocs(createClient(), vehicleId, kind, files);
                if (failed.length) alert(t("sh_upload_failed", { names: failed.join(", ") }));
                if (ref.current) ref.current.value = "";
                await refreshShipping(vehicleId);
                router.refresh();
                setBusy(false);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => ref.current?.click()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {busy ? "…" : t("sh_upload")}
            </button>
          </>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {docs.length === 0 && <li className="text-xs text-slate-400">{t("sh_no_files")}</li>}
        {docs.map((d) => (
          <li key={d.id} className="group flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-slate-100">
            <FileText className={`h-3.5 w-3.5 shrink-0 ${d.mime_type?.startsWith("image/") ? "text-sky-500" : "text-red-500"}`} />
            <a href={`/admin/stock/docs/${d.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-slate-700 hover:text-brand-700" title={d.file_name}>
              {d.file_name}
            </a>
            <a href={`/admin/stock/docs/${d.id}?download=1`} className="text-slate-400 hover:text-slate-700" title={t("download")}>
              <Download className="h-3.5 w-3.5" />
            </a>
            {canEdit && (
              <button
                type="button"
                className="text-slate-300 hover:text-red-600"
                title={t("delete")}
                onClick={async () => {
                  if (!confirm(t("confirm_delete"))) return;
                  try {
                    await deleteVehicleDoc(d.id, vehicleId);
                    router.refresh();
                  } catch (e) {
                    alert((e as Error).message);
                  }
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
