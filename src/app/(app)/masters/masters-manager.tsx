"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Gavel, Warehouse, Pencil, Trash2, Plus, Check, X, Search } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { en, type DictKey } from "@/lib/i18n/dictionaries";
import { SHIPMENT_MODES, type AuctionHouse, type Port, type ShipmentMode, type Yard } from "@/lib/types";
import { saveMaster, deleteMaster, type MasterKind } from "./actions";

type Tab = "ports" | "auctions" | "yards";
type Draft = Record<string, unknown>;

export function MastersManager({
  initialTab,
  ports,
  auctions,
  yards,
  canEdit,
}: {
  initialTab: Tab;
  ports: Port[];
  auctions: AuctionHouse[];
  yards: Yard[];
  canEdit: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState("");
  const [portFilter, setPortFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // row id, or "new"
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const portById = useMemo(() => new Map(ports.map((p) => [p.id, p])), [ports]);
  const kind: MasterKind = tab === "ports" ? "ports" : tab === "auctions" ? "auction_houses" : "yards";
  const msg = (e: string) => (e in en ? t(e as DictKey) : e);
  const modesLabel = (m: ShipmentMode[]) =>
    m.length === 1 && m[0] === "container" ? t("m_container_only") : m.map((x) => t(`m_mode_${x}` as DictKey)).join(" / ");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list: (Port | AuctionHouse | Yard)[] = tab === "ports" ? ports : tab === "auctions" ? auctions : yards;
    return list.filter(
      (r) =>
        (!s || JSON.stringify(r).toLowerCase().includes(s)) &&
        (tab === "ports" || !portFilter || (r as AuctionHouse).port_id === portFilter)
    );
  }, [tab, q, portFilter, ports, auctions, yards]);

  function begin(id: string, initial: Draft) {
    setError("");
    setEditing(id);
    setDraft(initial);
  }
  function cancel() {
    setEditing(null);
    setDraft({});
    setError("");
  }
  function save() {
    start(async () => {
      const res = await saveMaster(kind, editing === "new" ? null : editing, draft);
      if (res.error) return setError(msg(res.error));
      cancel();
      router.refresh();
    });
  }
  function remove(id: string, name: string) {
    if (!confirm(`${t("delete")}: ${name}?`)) return;
    start(async () => {
      const res = await deleteMaster(kind, id);
      if (res.error) alert(msg(res.error));
      router.refresh();
    });
  }

  const blank = (): Draft =>
    tab === "ports"
      ? { name: "", shipment_modes: ["roro", "container"], region: "", notes: "", active: true }
      : tab === "auctions"
        ? { name: "", port_id: portFilter || "", notes: "", active: true }
        : { name: "", port_id: portFilter || "", address: "", contact: "", phone: "", notes: "", active: true };

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const input = (k: string, placeholder?: string) => (
    <input className="input py-1.5" value={String(draft[k] ?? "")} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} />
  );
  const portSelect = () => (
    <select className="input py-1.5" value={String(draft.port_id ?? "")} onChange={(e) => set("port_id", e.target.value)}>
      <option value="">{t("m_no_port")}</option>
      {ports.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
  const activeToggle = () => (
    <label className="flex items-center gap-1.5 text-xs">
      <input type="checkbox" checked={draft.active !== false} onChange={(e) => set("active", e.target.checked)} />
      {t("m_active")}
    </label>
  );
  const editActions = () => (
    <div className="flex justify-end gap-1">
      <button className="rounded bg-emerald-600 p-1.5 text-white hover:bg-emerald-700" disabled={pending} onClick={save} title={t("save")}>
        <Check className="h-4 w-4" />
      </button>
      <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={cancel} title={t("cancel")}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
  const rowActions = (id: string, name: string, initial: Draft) =>
    canEdit && (
      <div className="flex justify-end gap-1">
        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => begin(id, initial)} title={t("edit")}>
          <Pencil className="h-4 w-4" />
        </button>
        <button className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => remove(id, name)} title={t("delete")}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  const inactive = (a: boolean) =>
    !a && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">{t("m_inactive")}</span>;

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "ports", label: t("m_ports"), icon: Anchor, count: ports.length },
    { key: "auctions", label: t("m_auctions"), icon: Gavel, count: auctions.length },
    { key: "yards", label: t("m_yards"), icon: Warehouse, count: yards.length },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              cancel();
              setQ("");
              router.replace(`/masters?tab=${key}`, { scroll: false });
            }}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium ${
              tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input w-60 pl-8" placeholder={t("search_placeholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {tab !== "ports" && (
          <select className="input w-auto" value={portFilter} onChange={(e) => setPortFilter(e.target.value)}>
            <option value="">{t("m_filter_port")}</option>
            {ports.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-slate-500">{t("total_records", { count: rows.length })}</span>
        {canEdit && (
          <button className="btn-primary ml-auto" onClick={() => begin("new", blank())} disabled={editing === "new"}>
            <Plus className="h-4 w-4" />
            {t("m_add")}
          </button>
        )}
      </div>

      {error && <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        {/* PORTS */}
        {tab === "ports" && (
          <table className="table">
            <thead>
              <tr>
                <th>{t("m_name")}</th>
                <th>{t("m_modes")}</th>
                <th>{t("m_region")}</th>
                <th>{t("m_auctions")}</th>
                <th>{t("m_notes")}</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {[...(editing === "new" ? [{ id: "new" } as Port] : []), ...(rows as Port[])].map((p) =>
                editing === p.id ? (
                  <tr key={p.id} className="bg-brand-50/40 align-top">
                    <td>{input("name", t("m_name"))}</td>
                    <td>
                      <div className="flex flex-col gap-1 text-xs">
                        {SHIPMENT_MODES.map((m) => {
                          const modes = (draft.shipment_modes as ShipmentMode[]) ?? [];
                          return (
                            <label key={m} className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={modes.includes(m)}
                                onChange={(e) => set("shipment_modes", e.target.checked ? [...modes, m] : modes.filter((x) => x !== m))}
                              />
                              {t(`m_mode_${m}` as DictKey)}
                            </label>
                          );
                        })}
                      </div>
                    </td>
                    <td>{input("region")}</td>
                    <td className="text-slate-400">—</td>
                    <td>
                      {input("notes")}
                      <div className="mt-1.5">{activeToggle()}</div>
                    </td>
                    <td>{editActions()}</td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td className="font-medium">
                      {p.name}
                      {inactive(p.active)}
                    </td>
                    <td>
                      <span
                        className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${
                          p.shipment_modes.includes("roro") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {modesLabel(p.shipment_modes)}
                      </span>
                    </td>
                    <td className="text-slate-600">{p.region ?? "—"}</td>
                    <td>
                      <button
                        className="whitespace-nowrap text-brand-700 hover:underline"
                        onClick={() => {
                          setTab("auctions");
                          setPortFilter(p.id);
                        }}
                      >
                        {t("m_count_auctions", { count: auctions.filter((a) => a.port_id === p.id).length })}
                      </button>
                    </td>
                    <td className="max-w-xs text-xs text-slate-500">{p.notes}</td>
                    <td>{rowActions(p.id, p.name, { ...p })}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}

        {/* AUCTION HOUSES */}
        {tab === "auctions" && (
          <table className="table">
            <thead>
              <tr>
                <th>{t("m_name")}</th>
                <th>{t("m_port")}</th>
                <th>{t("m_modes")}</th>
                <th>{t("m_notes")}</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {[...(editing === "new" ? [{ id: "new" } as AuctionHouse] : []), ...(rows as AuctionHouse[])].map((a) => {
                const port = a.port_id ? portById.get(a.port_id) : undefined;
                return editing === a.id ? (
                  <tr key={a.id} className="bg-brand-50/40 align-top">
                    <td>{input("name", t("m_name"))}</td>
                    <td>{portSelect()}</td>
                    <td className="text-slate-400">—</td>
                    <td>
                      {input("notes")}
                      <div className="mt-1.5">{activeToggle()}</div>
                    </td>
                    <td>{editActions()}</td>
                  </tr>
                ) : (
                  <tr key={a.id}>
                    <td className="font-medium">
                      {a.name}
                      {inactive(a.active)}
                    </td>
                    <td>{port?.name ?? "—"}</td>
                    <td>
                      {port && (
                        <span
                          className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${
                            port.shipment_modes.includes("roro") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {modesLabel(port.shipment_modes)}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs text-xs text-slate-500">{a.notes}</td>
                    <td>{rowActions(a.id, a.name, { ...a, port_id: a.port_id ?? "" })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* YARDS */}
        {tab === "yards" && (
          <table className="table">
            <thead>
              <tr>
                <th>{t("m_name")}</th>
                <th>{t("m_port")}</th>
                <th>{t("m_address")}</th>
                <th>{t("m_contact")}</th>
                <th>{t("m_phone")}</th>
                <th>{t("m_notes")}</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {[...(editing === "new" ? [{ id: "new" } as Yard] : []), ...(rows as Yard[])].map((y) =>
                editing === y.id ? (
                  <tr key={y.id} className="bg-brand-50/40 align-top">
                    <td>{input("name", t("m_name"))}</td>
                    <td>{portSelect()}</td>
                    <td>{input("address")}</td>
                    <td>{input("contact")}</td>
                    <td>{input("phone")}</td>
                    <td>
                      {input("notes")}
                      <div className="mt-1.5">{activeToggle()}</div>
                    </td>
                    <td>{editActions()}</td>
                  </tr>
                ) : (
                  <tr key={y.id}>
                    <td className="font-medium">
                      {y.name}
                      {inactive(y.active)}
                    </td>
                    <td>{y.port_id ? portById.get(y.port_id)?.name : "—"}</td>
                    <td className="max-w-xs whitespace-pre-line text-slate-600">{y.address ?? "—"}</td>
                    <td>{y.contact ?? "—"}</td>
                    <td>{y.phone ? <a href={`tel:${y.phone}`} className="text-brand-700 hover:underline">{y.phone}</a> : "—"}</td>
                    <td className="max-w-xs text-xs text-slate-500">{y.notes}</td>
                    <td>{rowActions(y.id, y.name, { ...y, port_id: y.port_id ?? "" })}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}

        {rows.length === 0 && editing !== "new" && <p className="px-4 py-10 text-center text-sm text-slate-500">{t("no_results")}</p>}
      </div>
    </div>
  );
}
