"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, Search, Ship } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { money } from "@/lib/format";
import { CURRENCIES, SHIPMENT_TYPES, type FreightRate, type Port, type ShipmentType } from "@/lib/types";
import { Badge, Empty, IconChip } from "@/components/ui";
import { Modal } from "@/components/modal";
import { saveFreightRate, deleteFreightRate, type FreightInput } from "./actions";

const blank = (): FreightInput => ({
  port_id: null,
  destination: "",
  country: "",
  shipment_type: "roro",
  amount: 0,
  currency: "USD",
  valid_until: null,
  notes: "",
  active: true,
});

const SHIP_TONE: Record<ShipmentType, string> = {
  roro: "bg-sky-50 text-sky-700 ring-sky-600/20",
  container_20: "bg-violet-50 text-violet-700 ring-violet-600/20",
  container_40: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20",
};

export function FreightManager({ rates, ports, canEdit }: { rates: FreightRate[]; ports: Port[]; canEdit: boolean }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [ship, setShip] = useState<ShipmentType | "">("");
  const [portFilter, setPortFilter] = useState("");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FreightInput>(blank());
  const portName = useMemo(() => new Map(ports.map((p) => [p.id, p.name])), [ports]);
  const today = new Date().toISOString().slice(0, 10);

  const rows = rates.filter((r) => {
    const s = q.trim().toLowerCase();
    if (s && !`${r.destination} ${r.country ?? ""}`.toLowerCase().includes(s)) return false;
    if (ship && r.shipment_type !== ship) return false;
    if (portFilter && (r.port_id ?? "any") !== portFilter) return false;
    return true;
  });

  const err = (e: string) => alert(e.startsWith("fr_") ? t(e as DictKey) : e);
  const save = () =>
    start(async () => {
      const res = await saveFreightRate(editing === "new" ? null : editing, form);
      if (res.error) return setFormError(res.error.startsWith("fr_") ? t(res.error as DictKey) : res.error);
      close();
      router.refresh();
    });
  const remove = (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    start(async () => {
      const res = await deleteFreightRate(id);
      if (res.error) return err(res.error);
      router.refresh();
    });
  };
  const set = <K extends keyof FreightInput>(k: K, v: FreightInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const [formError, setFormError] = useState("");
  const close = () => {
    setEditing(null);
    setFormError("");
  };
  const formBody = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="label">{t("fr_loading")}</label>
        <select className="input" value={form.port_id ?? ""} onChange={(e) => set("port_id", e.target.value || null)}>
          <option value="">{t("fr_any_port")}</option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t("fr_shipment")}</label>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {SHIPMENT_TYPES.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => set("shipment_type", x)}
              className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                form.shipment_type === x ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t(`ship_${x}` as DictKey)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">
          {t("fr_destination")} <span className="text-brand-600">*</span>
        </label>
        <input className="input" autoFocus value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Karachi" />
      </div>
      <div>
        <label className="label">{t("fr_country")}</label>
        <input className="input" value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} placeholder="Pakistan" />
      </div>
      <div>
        <label className="label">
          {t("fr_amount")} <span className="text-brand-600">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            step="any"
            className="input text-right text-base font-semibold"
            value={form.amount || ""}
            placeholder="0"
            onChange={(e) => set("amount", Number(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <select className="input w-24" value={form.currency} onChange={(e) => set("currency", e.target.value as FreightInput["currency"])}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">{t("fr_valid_until")}</label>
        <input type="date" className="input" value={form.valid_until ?? ""} onChange={(e) => set("valid_until", e.target.value || null)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t("m_notes")}</label>
        <textarea className="input" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-brand-600" />
        {t("m_active")}
      </label>
      {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{formError}</p>}
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input w-64 pl-9" placeholder={t("fr_search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={portFilter} onChange={(e) => setPortFilter(e.target.value)}>
          <option value="">{t("m_filter_port")}</option>
          <option value="any">{t("fr_any_port")}</option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={ship} onChange={(e) => setShip(e.target.value as ShipmentType | "")}>
          <option value="">{t("fr_all_shipments")}</option>
          {SHIPMENT_TYPES.map((s) => (
            <option key={s} value={s}>
              {t(`ship_${s}` as DictKey)}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">{rows.length}</span>
        {canEdit && (
          <button
            type="button"
            className="btn-primary ml-auto"
            onClick={() => {
              setForm(blank());
              setEditing("new");
            }}
          >
            <Plus className="h-4 w-4" />
            {t("fr_add")}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t("fr_loading")}</th>
              <th>{t("fr_destination")}</th>
              <th>{t("fr_country")}</th>
              <th>{t("fr_shipment")}</th>
              <th className="text-right">{t("fr_amount")}</th>
              <th>{t("fr_valid_until")}</th>
              <th>{t("m_notes")}</th>
              <th>{t("status")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
                <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                  <td className="whitespace-nowrap">{r.port_id ? portName.get(r.port_id) : <span className="text-slate-400">{t("fr_any_port")}</span>}</td>
                  <td className="font-semibold text-slate-800">{r.destination}</td>
                  <td>{r.country ?? "—"}</td>
                  <td>
                    <Badge className={SHIP_TONE[r.shipment_type]}>{t(`ship_${r.shipment_type}` as DictKey)}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(r.amount, r.currency, locale)}</td>
                  <td className="whitespace-nowrap">
                    {r.valid_until ? (
                      r.valid_until < today ? (
                        <Badge className="bg-red-50 text-red-600 ring-red-600/20">
                          {t("fr_expired")} · {r.valid_until}
                        </Badge>
                      ) : (
                        r.valid_until
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[14rem] truncate text-slate-500" title={r.notes ?? ""}>
                    {r.notes ?? ""}
                  </td>
                  <td>
                    {r.active ? (
                      <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">{t("m_active")}</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500 ring-slate-400/20">{t("m_inactive")}</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          title={t("edit")}
                          onClick={() => {
                            setForm({
                              port_id: r.port_id,
                              destination: r.destination,
                              country: r.country,
                              shipment_type: r.shipment_type,
                              amount: Number(r.amount),
                              currency: r.currency,
                              valid_until: r.valid_until,
                              notes: r.notes,
                              active: r.active,
                            });
                            setEditing(r.id);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title={t("delete")} onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <Empty>{t("fr_none")}</Empty>}
      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === "new" ? t("fr_add") : `${t("edit")} · ${form.destination}`}
        icon={
          <IconChip tone="sky" size="sm">
            <Ship />
          </IconChip>
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={close}>
              {t("cancel")}
            </button>
            <button type="button" className="btn-primary" disabled={pending} onClick={save}>
              <Check className="h-4 w-4" />
              {pending ? t("saving") : t("save")}
            </button>
          </>
        }
      >
        {formBody}
      </Modal>
    </div>
  );
}
