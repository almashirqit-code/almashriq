"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag, Plus, Pencil, Trash2, Eye, EyeOff, Upload, Check } from "lucide-react";
import { photoStorage } from "@/lib/photo-upload";
import { siteAssetUrl } from "@/lib/format";
import { resizeImage } from "@/lib/images";
import { CURRENCIES } from "@/lib/types";
import { Badge, Empty, IconChip } from "@/components/ui";
import { Modal } from "@/components/modal";
import { saveOffer, setOfferActive, deleteOffer, type OfferInput } from "./actions";

export type OfferRow = OfferInput & { id: string; created_at: string };

const STATUS: Record<string, string> = {
  live: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-600/20",
  expired: "bg-slate-100 text-slate-500 ring-slate-400/20",
  off: "bg-slate-100 text-slate-500 ring-slate-400/20",
};
const blank = (today: string): OfferInput => ({
  title: "",
  summary: "",
  discount_pct: null,
  special_price: null,
  price_currency: "USD",
  starts_on: today,
  ends_on: "",
  stock_nos: "",
  banner_path: null,
  active: true,
});
const num = (v: string) => (v === "" ? null : Number(v));

function statusOf(o: OfferRow, today: string) {
  if (!o.active) return "off";
  if (o.ends_on && o.ends_on < today) return "expired";
  if (o.starts_on > today) return "scheduled";
  return "live";
}

export function OffersManager({ offers, today }: { offers: OfferRow[]; today: string }) {
  const router = useRouter();
  const [edit, setEdit] = useState<OfferInput | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const bannerRef = useRef<HTMLInputElement>(null);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => (setErr(""), setEdit(blank(today)))}>
          <Plus className="h-4 w-4" />
          Add offer
        </button>
      </div>

      {offers.length === 0 ? (
        <div className="card">
          <Empty>No offers yet.</Empty>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((o) => {
            const st = statusOf(o, today);
            return (
              <div key={o.id} className={`card flex flex-col overflow-hidden ${st !== "live" ? "opacity-80" : ""}`}>
                {o.banner_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={siteAssetUrl(o.banner_path)} alt="" className="aspect-[3/1] w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{o.title}</div>
                      <div className="text-xs text-slate-500">
                        {o.starts_on} → {o.ends_on || "no end date"}
                      </div>
                    </div>
                    <Badge className={STATUS[st]}>{st}</Badge>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-700">
                    {[o.discount_pct ? `${Number(o.discount_pct)}% off` : null, o.special_price ? `FOB ${o.price_currency} ${Number(o.special_price).toLocaleString()}` : null].filter(Boolean).join(" · ")}
                  </div>
                  {o.summary && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{o.summary}</p>}
                  {o.stock_nos && <p className="mt-1 truncate text-xs text-slate-500">Cars: {o.stock_nos}</p>}
                  <div className="mt-auto flex items-center gap-1 pt-3 text-xs">
                    <span className="mr-auto" />
                    {o.active ? (
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-500 hover:bg-slate-100" onClick={() => run(() => setOfferActive(o.id, false))}>
                        <EyeOff className="h-3.5 w-3.5" /> Switch off
                      </button>
                    ) : (
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => run(() => setOfferActive(o.id, true))}>
                        <Eye className="h-3.5 w-3.5" /> Switch on
                      </button>
                    )}
                    <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => (setErr(""), setEdit({ ...o }))} title="Edit" aria-label="Edit offer">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete" aria-label="Delete offer" onClick={() => confirm("Delete this offer?") && run(() => deleteOffer(o.id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit offer" : "Add offer"}
        icon={
          <IconChip tone="brand" size="sm">
            <Tag />
          </IconChip>
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                edit &&
                start(async () => {
                  const r = await saveOffer(edit);
                  if (r.error) return setErr(r.error);
                  setEdit(null);
                  router.refresh();
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
            <div className="sm:col-span-2">
              <label className="label" htmlFor="offer-title">Title *</label>
              <input id="offer-title" className="input" maxLength={120} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="December SUV sale" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="offer-summary">Short text</label>
              <textarea id="offer-summary" className="input" rows={3} maxLength={500} value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="offer-pct">Discount %</label>
              <input id="offer-pct" type="number" min={1} max={99} step="0.5" className="input" value={edit.discount_pct ?? ""} onChange={(e) => setEdit({ ...edit, discount_pct: num(e.target.value) })} />
            </div>
            <div>
              <label className="label" htmlFor="offer-price">Special FOB price</label>
              <div className="flex gap-2">
                <select className="input w-24" aria-label="Currency" value={edit.price_currency} onChange={(e) => setEdit({ ...edit, price_currency: e.target.value as OfferInput["price_currency"] })}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input id="offer-price" type="number" min={1} className="input" value={edit.special_price ?? ""} onChange={(e) => setEdit({ ...edit, special_price: num(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="offer-start">Starts *</label>
              <input id="offer-start" type="date" className="input" value={edit.starts_on} onChange={(e) => setEdit({ ...edit, starts_on: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="offer-end">Ends</label>
              <input id="offer-end" type="date" className="input" min={edit.starts_on} value={edit.ends_on} onChange={(e) => setEdit({ ...edit, ends_on: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="offer-cars">Linked cars (stock nos, comma separated)</label>
              <input id="offer-cars" className="input" value={edit.stock_nos} onChange={(e) => setEdit({ ...edit, stock_nos: e.target.value })} placeholder="AM1234, AM1250" />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
              <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
              Show on the website
            </label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              {edit.banner_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={siteAssetUrl(edit.banner_path)} alt="" className="h-14 w-40 rounded-lg object-cover" />
              )}
              <input
                ref={bannerRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const body = await resizeImage(f, 1600, 0.85);
                  const path = `offers/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
                  const up = await photoStorage.upload(`site-assets/${path}`, body, { contentType: body.type || "image/jpeg" });
                  if (up.error) return alert(up.error.message);
                  setEdit({ ...edit, banner_path: path });
                }}
              />
              <button type="button" className="btn-secondary" onClick={() => bannerRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {edit.banner_path ? "Change banner" : "Banner image"}
              </button>
              {edit.banner_path && (
                <button type="button" className="btn-secondary" onClick={() => setEdit({ ...edit, banner_path: null })}>
                  Remove
                </button>
              )}
            </div>
            {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
