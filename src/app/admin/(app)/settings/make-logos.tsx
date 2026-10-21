"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images";
import { saveMakeLogo, type MakeLogoInput } from "./make-actions";

export type MakeRow = { make: string; label: string; logo_path: string | null; n: number; featured: boolean; sort_order: number };

const assetUrl = (p: string) => (p.startsWith("http") ? p : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets/${p}`);

/** Upload a logo per make (shown in "Shop by make" on the website). */
export function MakeLogos({ makes, canEdit }: { makes: MakeRow[]; canEdit: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3.5 text-sm text-slate-500">
        Upload a logo image for each make, or paste a link to one (PNG/SVG with a transparent background works best — use the manufacturer’s official media/press logo where possible). Makes without a logo show a styled name badge on the website.
        Featured makes appear on the homepage; lower sort numbers come first.
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {makes.map((m) => (
          <MakeCard key={m.make} row={m} canEdit={canEdit} />
        ))}
        {makes.length === 0 && <p className="p-6 text-sm text-slate-500">No makes on the website yet.</p>}
      </div>
    </div>
  );
}

function MakeCard({ row, canEdit }: { row: MakeRow; canEdit: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [v, setV] = useState<MakeLogoInput>({ make: row.make, label: row.label, logo_path: row.logo_path, featured: row.featured, sort_order: row.sort_order });
  const [pending, start] = useTransition();
  const save = (next: MakeLogoInput) =>
    start(async () => {
      const r = await saveMakeLogo(next);
      if (r.error) return alert(r.error);
      setV(next);
      router.refresh();
    });

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200">
          {v.logo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={assetUrl(v.logo_path)} alt={v.label} className="max-h-12 max-w-[72px] object-contain" />
          ) : (
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">{v.label.slice(0, 6)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            className="input py-1 text-sm font-semibold"
            value={v.label}
            disabled={!canEdit}
            onChange={(e) => setV({ ...v, label: e.target.value })}
            onBlur={() => v.label !== row.label && save(v)}
          />
          <div className="mt-1 text-[11px] text-slate-500">{row.n.toLocaleString()} cars</div>
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="file"
            accept="image/png,image/webp,image/svg+xml,image/jpeg"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const body = file.type === "image/svg+xml" ? file : await resizeImage(file, 400, 0.9);
              const ext = file.type === "image/svg+xml" ? "svg" : body.type === "image/png" ? "png" : body.type === "image/webp" ? "webp" : "jpg";
              const path = `makes/${row.make.replace(/[^a-z0-9-]+/g, "-")}-${Date.now()}.${ext}`;
              const up = await createClient().storage.from("site-assets").upload(path, body, { contentType: body.type || file.type, cacheControl: "31536000" });
              if (ref.current) ref.current.value = "";
              if (up.error) return alert(up.error.message);
              save({ ...v, logo_path: path });
            }}
          />
          <button type="button" className="btn-secondary flex-1 py-1.5 text-xs" onClick={() => ref.current?.click()} disabled={pending}>
            <Upload className="h-3.5 w-3.5" />
            {v.logo_path ? "Replace logo" : "Upload logo"}
          </button>
          {v.logo_path && (
            <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remove logo" onClick={() => save({ ...v, logo_path: null })}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            title={v.featured ? "Featured on homepage" : "Not featured"}
            onClick={() => save({ ...v, featured: !v.featured })}
            className={`rounded-lg p-2 ${v.featured ? "bg-amber-50 text-amber-500" : "text-slate-300 hover:bg-slate-50"}`}
          >
            <Star className="h-4 w-4" fill={v.featured ? "currentColor" : "none"} />
          </button>
          <input
            type="number"
            className="input w-16 py-1.5 text-center text-xs"
            title="Sort order"
            value={v.sort_order}
            onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })}
            onBlur={() => v.sort_order !== row.sort_order && save(v)}
          />
        </div>
      )}
      {canEdit && (
        <div className="flex items-center gap-2">
          <input
            className="input flex-1 py-1 text-xs"
            placeholder="…or paste image link (https://…)"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), (e.target as HTMLInputElement).blur())}
            onBlur={(e) => {
              const url = e.target.value.trim();
              if (!url) return;
              if (!/^https:\/\/\S+$/i.test(url)) return alert("Please paste a full https:// image link");
              e.target.value = "";
              save({ ...v, logo_path: url });
            }}
          />
          <a
            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${v.label} car logo png transparent`)}`}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-xs font-semibold text-brand-700 hover:underline"
          >
            Find ↗
          </a>
        </div>
      )}
    </div>
  );
}
