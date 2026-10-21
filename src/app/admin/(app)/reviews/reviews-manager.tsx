"use client";

import { FLAGS } from "@/lib/brand-assets";

import { dicebear } from "@/lib/avatar";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Plus, Pencil, Trash2, Eye, EyeOff, Download, Upload, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images";
import { Badge, Empty, IconChip } from "@/components/ui";
import { Modal } from "@/components/modal";
import { saveReview, setReviewStatus, deleteReview, importOldReviews, type ReviewInput } from "./actions";

export type ReviewRow = ReviewInput & { id: string; source: string; created_at: string };

const assetUrl = (p: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets/${p}`;
const STATUS: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/25",
  hidden: "bg-slate-100 text-slate-500 ring-slate-400/20",
};
const blank = (): ReviewInput => ({ customer_name: "", country: "", rating: 5, title: "", body: "", vehicle: "", photo_path: null, review_date: new Date().toISOString().slice(0, 10), status: "published" });

export function Stars({ n, size = "h-4 w-4" }: { n: number; size?: string }) {
  return (
    <span className="inline-flex text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={size} fill={i <= n ? "currentColor" : "none"} strokeWidth={1.5} />
      ))}
    </span>
  );
}

export function ReviewsManager({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<ReviewInput | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);
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
        <button type="button" className="btn-primary" onClick={() => (setErr(""), setEdit(blank()))}>
          <Plus className="h-4 w-4" />
          Add review
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await importOldReviews();
              if (r.error) throw new Error(r.error);
              alert(`Found ${r.found} reviews on the old website — ${r.added} new ones added as "Pending". Publish the genuine ones.`);
            })
          }
        >
          <Download className="h-4 w-4" />
          Import from old website
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="card">
          <Empty>No reviews yet.</Empty>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.id} className={`card flex flex-col p-4 ${r.status !== "published" ? "opacity-80" : ""}`}>
              <div className="flex items-start gap-3">
                {r.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(r.photo_path)} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={dicebear(r.customer_name)} alt="" className="h-11 w-11 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{r.customer_name}</div>
                  <div className="text-xs text-slate-500">{[r.country, r.vehicle, r.review_date].filter(Boolean).join(" · ")}</div>
                  <Stars n={r.rating} size="h-3.5 w-3.5" />
                </div>
                <Badge className={STATUS[r.status]}>{r.status}</Badge>
              </div>
              {r.title && <div className="mt-3 font-semibold">{r.title}</div>}
              <p className="mt-2 line-clamp-5 text-sm text-slate-600">{r.body}</p>
              <div className="mt-auto flex items-center gap-1 pt-3 text-xs">
                <span className="mr-auto text-slate-400">{r.source === "old_site" ? "Imported from old site" : r.source === "customer" ? "Sent by customer" : "Added by staff"}</span>
                {r.status !== "published" ? (
                  <button type="button" className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-100" onClick={() => run(() => setReviewStatus(r.id, "published"))}>
                    <Eye className="h-3.5 w-3.5" /> Publish
                  </button>
                ) : (
                  <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-500 hover:bg-slate-100" onClick={() => run(() => setReviewStatus(r.id, "hidden"))}>
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </button>
                )}
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => (setErr(""), setEdit({ ...r }))} title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => confirm("Delete this review?") && run(() => deleteReview(r.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit review" : "Add review"}
        icon={
          <IconChip tone="amber" size="sm">
            <Star />
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
                  const r = await saveReview(edit);
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
            <div>
              <label className="label">Customer name *</label>
              <input className="input" value={edit.customer_name} onChange={(e) => setEdit({ ...edit, customer_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" list="review-countries" value={edit.country ?? ""} onChange={(e) => setEdit({ ...edit, country: e.target.value })} placeholder="Kenya" />
              <datalist id="review-countries">{Object.values(FLAGS).map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="label">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" onClick={() => setEdit({ ...edit, rating: i })} className="text-amber-400">
                    <Star className="h-7 w-7" fill={i <= edit.rating ? "currentColor" : "none"} strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={edit.review_date} onChange={(e) => setEdit({ ...edit, review_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Car bought</label>
              <input className="input" value={edit.vehicle ?? ""} onChange={(e) => setEdit({ ...edit, vehicle: e.target.value })} placeholder="Toyota Raize 2020" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as ReviewInput["status"] })}>
                <option value="published">Published</option>
                <option value="pending">Pending</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Headline</label>
              <input className="input" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Review *</label>
              <textarea className="input" rows={5} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              {edit.photo_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(edit.photo_path)} alt="" className="h-14 w-14 rounded-full object-cover" />
              )}
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const body = await resizeImage(f, 600, 0.85);
                  const path = `reviews/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
                  const up = await createClient().storage.from("site-assets").upload(path, body, { contentType: body.type || "image/jpeg" });
                  if (up.error) return alert(up.error.message);
                  setEdit({ ...edit, photo_path: path });
                }}
              />
              <button type="button" className="btn-secondary" onClick={() => photoRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {edit.photo_path ? "Change photo" : "Customer / car photo"}
              </button>
            </div>
            {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
