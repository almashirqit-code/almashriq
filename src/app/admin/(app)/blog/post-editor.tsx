"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Eye, PenLine, Check, Image as ImageIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images";
import { plainText, renderMarkdown, slugify } from "@/lib/markdown";
import { savePost, type PostInput } from "./actions";

const assetUrl = (p: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-assets/${p}`;

async function uploadAsset(file: File, folder: string) {
  const body = await resizeImage(file, 1800, 0.85);
  const ext = body.type === "image/png" ? "png" : body.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const up = await createClient().storage.from("site-assets").upload(path, body, { contentType: body.type || "image/jpeg", cacheControl: "31536000" });
  if (up.error) throw up.error;
  return path;
}

export function PostEditor({ initial }: { initial?: PostInput }) {
  const router = useRouter();
  const [p, setP] = useState<PostInput>(
    initial ?? { title: "", slug: "", excerpt: "", content: "", cover_path: null, tags: "", status: "draft", published_at: new Date().toISOString().slice(0, 10), seo_title: "", seo_description: "" }
  );
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [view, setView] = useState<"write" | "preview">("write");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const coverRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const html = useMemo(() => renderMarkdown(p.content), [p.content]);
  const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) => setP((x) => ({ ...x, [k]: v }));
  const metaDesc = p.seo_description || p.excerpt || plainText(p.content);

  const save = (status: "draft" | "published") =>
    start(async () => {
      setError("");
      const r = await savePost({ ...p, status });
      if (r.error) return setError(r.error);
      set("status", status);
      if (!p.id && r.id) router.replace(`/admin/blog/${r.id}`);
      router.refresh();
    });

  const insertAtCursor = (text: string) => {
    const el = textRef.current;
    if (!el) return set("content", p.content + text);
    const { selectionStart: a, selectionEnd: b } = el;
    set("content", p.content.slice(0, a) + text + p.content.slice(b));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <input
          className="w-full rounded-2xl border-0 bg-white px-5 py-4 text-2xl font-black tracking-tight shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-400"
          placeholder="Post title"
          value={p.title}
          onChange={(e) => {
            set("title", e.target.value);
            if (!slugTouched) set("slug", slugify(e.target.value));
          }}
        />
        <div className="card overflow-hidden">
          <div className="flex items-center gap-1 border-b border-slate-100 p-2">
            {(["write", "preview"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${view === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {v === "write" ? <PenLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {v === "write" ? "Write" : "Preview"}
              </button>
            ))}
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const path = await uploadAsset(f, "blog");
                  insertAtCursor(`\n![${f.name.replace(/\.[^.]+$/, "")}](${assetUrl(path)})\n`);
                } catch (err) {
                  alert((err as Error).message);
                }
                if (imgRef.current) imgRef.current.value = "";
              }}
            />
            <button type="button" onClick={() => imgRef.current?.click()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <ImageIcon className="h-4 w-4" />
              Insert image
            </button>
          </div>
          {view === "write" ? (
            <textarea
              ref={textRef}
              className="block min-h-[28rem] w-full resize-y border-0 p-5 font-mono text-sm leading-relaxed outline-none"
              placeholder={"Write in Markdown:\n\n## A heading\n\nA paragraph with **bold** text and a [link](https://example.com).\n\n- a list item\n- another item"}
              value={p.content}
              onChange={(e) => set("content", e.target.value)}
            />
          ) : (
            <article className="prose-blog min-h-[28rem] p-6" dangerouslySetInnerHTML={{ __html: html || "<p><em>Nothing to preview yet.</em></p>" }} />
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {p.status === "published" ? "Published" : "Draft"}
            </span>
            {p.status === "published" && p.slug && (
              <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sky-700 hover:underline">
                View on site ↗
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-secondary" disabled={pending} onClick={() => save("draft")}>
              Save draft
            </button>
            <button type="button" className="btn-primary" disabled={pending} onClick={() => save("published")}>
              <Check className="h-4 w-4" />
              {p.status === "published" ? "Update" : "Publish"}
            </button>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div>
            <label className="label">Publish date</label>
            <input type="date" className="input" value={p.published_at} onChange={(e) => set("published_at", e.target.value)} />
          </div>
        </section>

        <section className="card space-y-2 p-4">
          <label className="label">Cover image</label>
          {p.cover_path ? (
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(p.cover_path)} alt="" className="aspect-[16/9] w-full object-cover" />
              <button type="button" onClick={() => set("cover_path", null)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-700 shadow">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                set("cover_path", await uploadAsset(f, "blog"));
              } catch (err) {
                alert((err as Error).message);
              }
              if (coverRef.current) coverRef.current.value = "";
            }}
          />
          <button type="button" className="btn-secondary w-full" onClick={() => coverRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {p.cover_path ? "Replace cover" : "Upload cover"}
          </button>
        </section>

        <section className="card space-y-3 p-4">
          <div>
            <label className="label">URL</label>
            <div className="flex items-center rounded-xl bg-slate-50 px-3 text-sm text-slate-500 ring-1 ring-slate-200">
              /blog/
              <input
                className="w-full bg-transparent py-2 font-semibold text-slate-800 outline-none"
                value={p.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </div>
          </div>
          <div>
            <label className="label">Excerpt (shown in lists)</label>
            <textarea className="input" rows={3} value={p.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input className="input" value={p.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Buying guide, Shipping, Kenya" />
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <div className="text-sm font-bold">Search engine (SEO)</div>
          <div>
            <label className="label">SEO title ({(p.seo_title || p.title).length}/60)</label>
            <input className="input" value={p.seo_title} onChange={(e) => set("seo_title", e.target.value)} placeholder={p.title} />
          </div>
          <div>
            <label className="label">Meta description ({metaDesc.length}/160)</label>
            <textarea className="input" rows={3} value={p.seo_description} onChange={(e) => set("seo_description", e.target.value)} placeholder={metaDesc} />
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-[11px] text-emerald-700">almashriqtrading.site › blog › {p.slug || "…"}</div>
            <div className="truncate text-sm font-semibold text-blue-700">{p.seo_title || p.title || "Post title"}</div>
            <div className="line-clamp-2 text-xs text-slate-600">{metaDesc || "Description…"}</div>
          </div>
        </section>
      </aside>
    </div>
  );
}
