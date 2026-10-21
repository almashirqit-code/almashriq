"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Pencil, Plus, Tractor, Trash2 } from "lucide-react";
import { CURRENCIES, type BranchCode, type Currency, type VehicleStatus } from "@/lib/types";
import { publicImageUrl } from "@/lib/format";
import { branchFlag, branchName, DEFAULT_BRANCHES, jpyRate } from "@/lib/branches";
import { MACHINE_PHOTOS } from "@/lib/photo-zip";
import { makeNames, modelNames, type CatalogMake } from "@/lib/catalog";
import { blankMachine, machineCostJpy, machineTitle, MACHINE_CONDITIONS, MACHINE_MAKES, MACHINE_STATUSES, type MachineInput } from "@/lib/machinery";
import { Badge, Empty, IconChip } from "@/components/ui";
import { nextRef } from "@/lib/ref-actions";
import { Modal } from "@/components/modal";
import { StockPhotos, type StockPhoto } from "@/components/stock-photos";
import { deleteMachine, machineryImported, saveMachine, setMachineStatus, toggleMachineWebsite } from "./actions";

export type MachineRow = MachineInput & { id: string; created_at: string; machinery_images?: StockPhoto[] };

const STATUS: Record<VehicleStatus, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  reserved: "bg-amber-50 text-amber-700 ring-amber-600/25",
  sold: "bg-violet-50 text-violet-700 ring-violet-600/20",
  shipped: "bg-sky-50 text-sky-700 ring-sky-600/20",
};
const money = (v: number | null, c: Currency) => (v == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: c === "JPY" || c === "TWD" ? 0 : 2 }).format(v));
const cover = (m: MachineRow) => [...(m.machinery_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.path ?? null;

export function MachineryManager({
  machines,
  canEdit,
  seeCost,
  categories,
  rates,
  catalog = [],
}: {
  machines: MachineRow[];
  canEdit: boolean;
  seeCost: boolean;
  categories: string[];
  rates: Partial<Record<Currency, number>>;
  /** Makes & models list (machinery), for suggestions. */
  catalog?: CatalogMake[];
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<{ id: string | null; data: MachineInput; photos: StockPhoto[] } | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });

  const set = <K extends keyof MachineInput>(k: K, v: MachineInput[K]) => edit && setEdit({ ...edit, data: { ...edit.data, [k]: v } });
  const patch = (p: Partial<MachineInput>) => edit && setEdit({ ...edit, data: { ...edit.data, ...p } });
  const text = (k: keyof MachineInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, (e.target.value || null) as never);
  const number = (k: keyof MachineInput) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value === "" ? null : Number(e.target.value)) as never);
  const pickCurrency = (c: Currency) => patch({ cost_currency: c, cost_fx_rate: jpyRate(c, rates) ?? 0 });
  const pickBranch = (b: BranchCode) => {
    const cur = DEFAULT_BRANCHES.find((x) => x.code === b)!.currency;
    patch({ branch: b, cost_currency: cur, cost_fx_rate: jpyRate(cur, rates) ?? 0 });
  };

  const nextNo = () => {
    const nums = machines.map((m) => /^M-(\d+)$/i.exec(m.stock_no)?.[1]).filter(Boolean).map(Number);
    return `M-${String((nums.length ? Math.max(...nums) : 2000) + 1)}`;
  };
  const open = (id: string | null, data: MachineInput, photos: StockPhoto[] = []) => {
    setErr("");
    setNote("");
    setEdit({ id, data, photos });
  };
  const field = (label: string, el: React.ReactNode, wide = false) => (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {el}
    </div>
  );

  return (
    <>
      {canEdit && (
        <div className="flex border-b border-slate-100 px-3 py-2.5">
          <button
            type="button"
            className="btn-primary"
            onClick={async () => open(null, { ...blankMachine(), stock_no: await nextRef("machinery").catch(() => nextNo()) })}
          >
            <Plus className="h-4 w-4" />
            Add machine
          </button>
        </div>
      )}

      {machines.length === 0 ? (
        <Empty>No machines yet. Add one, or use Bulk import for a spreadsheet and a photos ZIP.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-16"></th>
                <th>Machine</th>
                <th>Specs</th>
                <th>Condition</th>
                <th className="text-right">Price</th>
                {seeCost && <th className="text-right">Cost</th>}
                <th>Status</th>
                <th>Website</th>
                {canEdit && <th className="w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => {
                const img = cover(m);
                const flag = branchFlag(m.branch);
                const n = m.machinery_images?.length ?? 0;
                return (
                  <tr key={m.id}>
                    <td>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={publicImageUrl(img)} alt="" className="h-11 w-14 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-11 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                          <Tractor className="h-5 w-5" />
                        </span>
                      )}
                    </td>
                    <td className="max-w-[16rem]">
                      <div className="flex items-center gap-1.5 truncate font-semibold">
                        {flag && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flag} alt={branchName(m.branch)} title={branchName(m.branch)} className="h-3 w-4 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10" />
                        )}
                        <span className="truncate">{machineTitle(m)}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">{m.stock_no}</span>
                        {m.category ? ` · ${m.category}` : ""}
                        {n > 1 ? ` · ${n} photos` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-600">
                      {[m.hours != null && `${m.hours.toLocaleString()} h`, m.engine_power_hp != null && `${m.engine_power_hp} hp`, m.operating_weight_kg != null && `${(Number(m.operating_weight_kg) / 1000).toFixed(1)} t`]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="text-sm capitalize">{m.condition}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{money(m.price, m.price_currency)}</td>
                    {seeCost && (
                      <td className="whitespace-nowrap text-right tabular-nums text-slate-500">
                        {m.purchase_price != null || m.expenses != null ? money(Number(m.purchase_price || 0) + Number(m.expenses || 0), m.cost_currency) : "—"}
                        {m.cost_currency !== "JPY" && (m.purchase_price != null || m.expenses != null) && <div className="text-[11px] text-slate-400">≈ {money(machineCostJpy(m), "JPY")}</div>}
                      </td>
                    )}
                    <td>
                      {canEdit ? (
                        <select
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS[m.status]}`}
                          value={m.status}
                          disabled={pending}
                          onChange={(e) => run(() => setMachineStatus(m.id, e.target.value as VehicleStatus))}
                        >
                          {MACHINE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge className={STATUS[m.status]}>{m.status.replace("_", " ")}</Badge>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => toggleMachineWebsite(m.id, !m.show_on_website))}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${m.show_on_website ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "text-slate-500 hover:bg-slate-100"}`}
                        >
                          {m.show_on_website ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {m.show_on_website ? "Shown" : "Hidden"}
                        </button>
                      ) : m.show_on_website ? (
                        "Shown"
                      ) : (
                        "Hidden"
                      )}
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap text-right">
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-700" title="Edit" onClick={() => open(m.id, { ...blankMachine(), ...m }, m.machinery_images ?? [])}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                          onClick={() => confirm(`Delete ${m.stock_no} and its photos?`) && run(() => deleteMachine(m.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? `Edit machine ${edit.data.stock_no}` : "Add machine"}
        icon={
          <IconChip tone="amber" size="sm">
            <Tractor />
          </IconChip>
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>
              {edit?.id ? "Close" : "Cancel"}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                edit &&
                start(async () => {
                  const r = await saveMachine(edit.id, edit.data);
                  if (r.error) return setErr(r.error);
                  setErr("");
                  router.refresh();
                  if (!edit.id && r.id) {
                    // Stay open so photos can be added to the new machine.
                    setEdit({ ...edit, id: r.id });
                    setNote("Saved. You can add photos now.");
                  } else setEdit(null);
                })
              }
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </>
        }
      >
        {edit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field("Stock no. *", <input className="input font-mono" value={edit.data.stock_no} onChange={(e) => set("stock_no", e.target.value)} />)}
            {field(
              "Branch (ships from)",
              <select className="input" value={edit.data.branch} onChange={(e) => pickBranch(e.target.value as BranchCode)}>
                {DEFAULT_BRANCHES.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            {field(
              "Type",
              <>
                <input className="input" list="machine-categories" value={edit.data.category ?? ""} onChange={text("category")} placeholder="Excavator" />
                <datalist id="machine-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
            {field(
              "Make *",
              <>
                <input className="input" list="machine-makes" autoComplete="off" value={edit.data.make} onChange={(e) => set("make", e.target.value)} placeholder="Komatsu" />
                <datalist id="machine-makes">
                  {(catalog.length ? makeNames(catalog) : MACHINE_MAKES).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
            {field(
              "Model *",
              <>
                <input className="input" list="machine-models" autoComplete="off" value={edit.data.model} onChange={(e) => set("model", e.target.value)} placeholder="PC200-8" />
                <datalist id="machine-models">
                  {modelNames(catalog, edit.data.make).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <a href="/admin/settings?tab=catalog" target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-brand-600 hover:underline">
                  Not in the list? Manage makes &amp; models →
                </a>
              </>
            )}
            {field("Year", <input type="number" className="input" value={edit.data.year ?? ""} onChange={number("year")} />)}
            {field("Working hours", <input type="number" min={0} className="input" value={edit.data.hours ?? ""} onChange={number("hours")} />)}
            {field("Serial no.", <input className="input font-mono" value={edit.data.serial_no ?? ""} onChange={text("serial_no")} />)}
            {field("Operating weight (kg)", <input type="number" min={0} step="any" className="input" value={edit.data.operating_weight_kg ?? ""} onChange={number("operating_weight_kg")} />)}
            {field("Engine power (hp)", <input type="number" min={0} step="any" className="input" value={edit.data.engine_power_hp ?? ""} onChange={number("engine_power_hp")} />)}
            {field("Bucket capacity (m³)", <input type="number" min={0} step="any" className="input" value={edit.data.bucket_capacity_m3 ?? ""} onChange={number("bucket_capacity_m3")} />)}
            {field(
              "Condition",
              <select className="input capitalize" value={edit.data.condition} onChange={(e) => set("condition", e.target.value as MachineInput["condition"])}>
                {MACHINE_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            {field("Attachments", <input className="input" value={edit.data.attachments ?? ""} onChange={text("attachments")} placeholder="Bucket, breaker line, quick coupler…" />, true)}
            {field("Location / yard", <input className="input" value={edit.data.location ?? ""} onChange={text("location")} />)}
            {field(
              "Status",
              <select className="input" value={edit.data.status} onChange={(e) => set("status", e.target.value as VehicleStatus)}>
                {MACHINE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            )}
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <div>
                <label className="label">Selling price</label>
                <input type="number" min={0} className="input" value={edit.data.price ?? ""} onChange={number("price")} placeholder="Blank = ask for price" />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={edit.data.price_currency} onChange={(e) => set("price_currency", e.target.value as Currency)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {seeCost && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Buying cost (internal)</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="label">Currency</label>
                    <select className="input" value={edit.data.cost_currency} onChange={(e) => pickCurrency(e.target.value as Currency)}>
                      {CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Purchase price</label>
                    <input type="number" min={0} step="any" className="input" value={edit.data.purchase_price ?? ""} onChange={number("purchase_price")} />
                  </div>
                  <div>
                    <label className="label">Expenses</label>
                    <input type="number" min={0} step="any" className="input" value={edit.data.expenses ?? ""} onChange={number("expenses")} />
                  </div>
                  {edit.data.cost_currency !== "JPY" && (
                    <div>
                      <label className="label">1 {edit.data.cost_currency} = ? JPY</label>
                      <input type="number" min={0} step="any" className="input" value={edit.data.cost_fx_rate || ""} onChange={(e) => set("cost_fx_rate", Number(e.target.value) || 0)} />
                    </div>
                  )}
                </div>
                {(edit.data.purchase_price != null || edit.data.expenses != null) && (edit.data.cost_currency === "JPY" || edit.data.cost_fx_rate > 0) && (
                  <p className="mt-2 text-xs text-slate-600">
                    Total cost: <b>{money(Number(edit.data.purchase_price || 0) + Number(edit.data.expenses || 0), edit.data.cost_currency)}</b>
                    {edit.data.cost_currency !== "JPY" && (
                      <>
                        {" "}
                        ≈ <b>{money(machineCostJpy(edit.data), "JPY")}</b>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
            {field("Description (shown on website)", <textarea className="input" rows={3} value={edit.data.description ?? ""} onChange={text("description")} />, true)}
            {field("Internal notes", <textarea className="input" rows={2} value={edit.data.notes ?? ""} onChange={text("notes")} />, true)}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={edit.data.show_on_website} onChange={(e) => set("show_on_website", e.target.checked)} />
              Show on the website Machinery page
            </label>
            <div className="rounded-xl border border-slate-200 p-3 sm:col-span-2">
              {edit.id ? (
                <StockPhotos key={edit.id} table={MACHINE_PHOTOS} ownerId={edit.id} photos={edit.photos} canEdit={canEdit} onChanged={async () => (await machineryImported(), router.refresh())} />
              ) : (
                <p className="text-sm text-slate-500">Save the machine first, then add photos here (or upload a photos ZIP in Bulk import).</p>
              )}
            </div>
            {note && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2">{note}</p>}
            {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
