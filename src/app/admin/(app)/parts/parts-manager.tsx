"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { CURRENCIES, type BranchCode, type Currency } from "@/lib/types";
import { publicImageUrl } from "@/lib/format";
import { branchFlag, branchName, DEFAULT_BRANCHES, jpyRate } from "@/lib/branches";
import { PART_PHOTOS } from "@/lib/photo-zip";
import { blankPart, partCostJpy, partFits, PART_CONDITIONS, PART_STATUSES, type PartInput, type PartStatus } from "@/lib/parts";
import { Badge, Empty, IconChip } from "@/components/ui";
import { Modal } from "@/components/modal";
import { StockPhotos, type StockPhoto } from "@/components/stock-photos";
import { deletePart, partsImported, savePart, setPartStatus, togglePartWebsite } from "./actions";

export type PartRow = PartInput & { id: string; created_at: string; part_images?: StockPhoto[] };

const STATUS: Record<PartStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  reserved: "bg-amber-50 text-amber-700 ring-amber-600/25",
  sold: "bg-violet-50 text-violet-700 ring-violet-600/20",
};
const money = (v: number | null, c: Currency) => (v == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: c === "JPY" || c === "TWD" ? 0 : 2 }).format(v));
const cover = (p: PartRow) => [...(p.part_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.path ?? null;

export function PartsManager({
  parts,
  canEdit,
  categories,
  rates,
}: {
  parts: PartRow[];
  canEdit: boolean;
  categories: string[];
  rates: Partial<Record<Currency, number>>;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<{ id: string | null; data: PartInput; photos: StockPhoto[] } | null>(null);
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

  const set = <K extends keyof PartInput>(k: K, v: PartInput[K]) => edit && setEdit({ ...edit, data: { ...edit.data, [k]: v } });
  const patch = (p: Partial<PartInput>) => edit && setEdit({ ...edit, data: { ...edit.data, ...p } });
  const text = (k: keyof PartInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, (e.target.value || null) as never);
  const number = (k: keyof PartInput) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value === "" ? null : Number(e.target.value)) as never);
  const pickCurrency = (c: Currency) => patch({ cost_currency: c, cost_fx_rate: jpyRate(c, rates) ?? 0 });
  const pickBranch = (b: BranchCode) => {
    const cur = DEFAULT_BRANCHES.find((x) => x.code === b)!.currency;
    patch({ branch: b, cost_currency: cur, cost_fx_rate: jpyRate(cur, rates) ?? 0 });
  };

  const nextNo = () => {
    const nums = parts.map((p) => /^P-(\d+)$/i.exec(p.part_no)?.[1]).filter(Boolean).map(Number);
    return `P-${String((nums.length ? Math.max(...nums) : 1000) + 1)}`;
  };
  const open = (id: string | null, data: PartInput, photos: StockPhoto[] = []) => {
    setErr("");
    setNote("");
    setEdit({ id, data, photos });
  };

  return (
    <>
      {canEdit && (
        <div className="flex border-b border-slate-100 px-3 py-2.5">
          <button type="button" className="btn-primary" onClick={() => open(null, { ...blankPart(), part_no: nextNo() })}>
            <Plus className="h-4 w-4" />
            Add part
          </button>
        </div>
      )}

      {parts.length === 0 ? (
        <Empty>No parts yet. Add one, or use Bulk import for a spreadsheet and a photos ZIP.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-14"></th>
                <th>Part</th>
                <th>Fits</th>
                <th>Condition</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
                {canEdit && <th className="text-right">Cost</th>}
                <th>Status</th>
                <th>Website</th>
                {canEdit && <th className="w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => {
                const img = cover(p);
                const flag = branchFlag(p.branch);
                return (
                  <tr key={p.id}>
                    <td>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={publicImageUrl(img)} alt="" className="h-10 w-12 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-10 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                          <Wrench className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                    <td className="max-w-[16rem]">
                      <div className="flex items-center gap-1.5 truncate font-semibold">
                        {flag && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flag} alt={branchName(p.branch)} title={branchName(p.branch)} className="h-3 w-4 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10" />
                        )}
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">{p.part_no}</span>
                        {p.category ? ` · ${p.category}` : ""}
                        {p.oem_no ? ` · OEM ${p.oem_no}` : ""}
                        {(p.part_images?.length ?? 0) > 1 ? ` · ${p.part_images!.length} photos` : ""}
                      </div>
                    </td>
                    <td className="max-w-[14rem] truncate text-sm text-slate-600">{partFits(p) || "—"}</td>
                    <td className="text-sm capitalize">{p.condition}</td>
                    <td className="text-right tabular-nums">{p.quantity}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{money(p.price, p.price_currency)}</td>
                    {canEdit && (
                      <td className="whitespace-nowrap text-right tabular-nums text-slate-500">
                        {money(p.cost, p.cost_currency ?? "JPY")}
                        {p.cost != null && p.cost_currency && p.cost_currency !== "JPY" && <div className="text-[11px] text-slate-400">≈ {money(partCostJpy(p), "JPY")}</div>}
                      </td>
                    )}
                    <td>
                      {canEdit ? (
                        <select
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS[p.status]}`}
                          value={p.status}
                          disabled={pending}
                          onChange={(e) => run(() => setPartStatus(p.id, e.target.value as PartStatus))}
                        >
                          {PART_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge className={STATUS[p.status]}>{p.status}</Badge>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => togglePartWebsite(p.id, !p.show_on_website))}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${p.show_on_website ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "text-slate-500 hover:bg-slate-100"}`}
                        >
                          {p.show_on_website ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {p.show_on_website ? "Shown" : "Hidden"}
                        </button>
                      ) : p.show_on_website ? (
                        "Shown"
                      ) : (
                        "Hidden"
                      )}
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap text-right">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
                          title="Edit"
                          onClick={() => open(p.id, { ...blankPart(), ...p }, p.part_images ?? [])}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                          onClick={() => confirm(`Delete part ${p.part_no} and its photos?`) && run(() => deletePart(p.id))}
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
        title={edit?.id ? `Edit part ${edit.data.part_no}` : "Add part"}
        icon={
          <IconChip tone="cyan" size="sm">
            <Wrench />
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
                  const r = await savePart(edit.id, edit.data);
                  if (r.error) return setErr(r.error);
                  setErr("");
                  router.refresh();
                  if (!edit.id && r.id) {
                    // Stay open so photos can be added to the new part.
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
            <div>
              <label className="label">Part no. *</label>
              <input className="input font-mono" value={edit.data.part_no} onChange={(e) => set("part_no", e.target.value)} />
            </div>
            <div>
              <label className="label">Part name *</label>
              <input className="input" value={edit.data.name} onChange={(e) => set("name", e.target.value)} placeholder="Front bumper" />
            </div>
            <div>
              <label className="label">Branch (ships from)</label>
              <select className="input" value={edit.data.branch} onChange={(e) => pickBranch(e.target.value as BranchCode)}>
                {DEFAULT_BRANCHES.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" list="part-categories" value={edit.data.category ?? ""} onChange={text("category")} />
              <datalist id="part-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Make</label>
              <input className="input" value={edit.data.make ?? ""} onChange={text("make")} placeholder="Toyota" />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" value={edit.data.model ?? ""} onChange={text("model")} placeholder="Prius" />
            </div>
            <div>
              <label className="label">Model code</label>
              <input className="input" value={edit.data.model_code ?? ""} onChange={text("model_code")} placeholder="ZVW30" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Year from</label>
                <input type="number" className="input" value={edit.data.year_from ?? ""} onChange={number("year_from")} />
              </div>
              <div>
                <label className="label">Year to</label>
                <input type="number" className="input" value={edit.data.year_to ?? ""} onChange={number("year_to")} />
              </div>
            </div>
            <div>
              <label className="label">OEM / genuine part no.</label>
              <input className="input font-mono" value={edit.data.oem_no ?? ""} onChange={text("oem_no")} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Condition</label>
                <select className="input capitalize" value={edit.data.condition} onChange={(e) => set("condition", e.target.value as PartInput["condition"])}>
                  {PART_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" min={0} className="input" value={edit.data.quantity} onChange={(e) => set("quantity", Number(e.target.value) || 0)} />
              </div>
            </div>
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
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <div>
                <label className="label">Cost (internal)</label>
                <input type="number" min={0} className="input" value={edit.data.cost ?? ""} onChange={number("cost")} />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={edit.data.cost_currency} onChange={(e) => pickCurrency(e.target.value as Currency)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {edit.data.cost_currency !== "JPY" && (
              <div>
                <label className="label">Rate: 1 {edit.data.cost_currency} = ? JPY</label>
                <input type="number" min={0} step="any" className="input" value={edit.data.cost_fx_rate || ""} onChange={(e) => set("cost_fx_rate", Number(e.target.value) || 0)} />
                {edit.data.cost != null && edit.data.cost_fx_rate > 0 && <p className="mt-1 text-xs text-slate-500">≈ {money(partCostJpy(edit.data), "JPY")}</p>}
              </div>
            )}
            <div>
              <label className="label">Location</label>
              <input className="input" value={edit.data.location ?? ""} onChange={text("location")} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input capitalize" value={edit.data.status} onChange={(e) => set("status", e.target.value as PartStatus)}>
                {PART_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description (shown on website)</label>
              <textarea className="input" rows={3} value={edit.data.description ?? ""} onChange={text("description")} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Internal notes</label>
              <textarea className="input" rows={2} value={edit.data.notes ?? ""} onChange={text("notes")} />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={edit.data.show_on_website} onChange={(e) => set("show_on_website", e.target.checked)} />
              Show on the website Parts page
            </label>
            <div className="rounded-xl border border-slate-200 p-3 sm:col-span-2">
              {edit.id ? (
                <StockPhotos key={edit.id} table={PART_PHOTOS} ownerId={edit.id} photos={edit.photos} canEdit={canEdit} onChanged={async () => (await partsImported(), router.refresh())} />
              ) : (
                <p className="text-sm text-slate-500">Save the part first, then add photos here (or upload a photos ZIP in Bulk import).</p>
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
