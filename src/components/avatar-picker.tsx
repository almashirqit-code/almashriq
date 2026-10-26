"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/images";
import { AVATAR_STYLES, avatarSrc, dicebear } from "@/lib/avatar";

/**
 * The signed-in user's avatar; click to upload a photo or pick a generated one.
 * Staff by default; customers pass folder "portal-avatars" and rpc "set_my_portal_avatar" (migration 0033).
 */
export function AvatarPicker({
  userId,
  name,
  current,
  size = "h-9 w-9",
  folder = "avatars",
  rpc = "set_my_avatar",
}: {
  userId: string;
  name: string;
  current: string | null;
  size?: string;
  folder?: "avatars" | "portal-avatars";
  rpc?: "set_my_avatar" | "set_my_portal_avatar";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  const save = (url: string | null) =>
    start(async () => {
      setErr(null);
      const { error } = await createClient().rpc(rpc, { p_url: url });
      if (error) return setErr(error.message);
      setValue(url);
      setOpen(false);
      router.refresh();
    });

  async function upload(f: File) {
    setErr(null);
    start(async () => {
      try {
        const blob = await resizeImage(f, 256);
        const path = `${folder}/${userId}/${Date.now()}.jpg`;
        const { error } = await createClient().storage.from("site-assets").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        const { error: e2 } = await createClient().rpc(rpc, { p_url: path });
        if (e2) throw e2;
        setValue(path);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Change picture" aria-label="Change picture" className={`${size} shrink-0 overflow-hidden rounded-full ring-2 ring-white/20 transition hover:ring-white/60`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc(value, name)} alt="" className="h-full w-full object-cover" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <div className={`relative w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-2xl ${pending ? "opacity-70" : ""}`}>
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <div className="text-sm font-bold">Your picture</div>
            <div className="mt-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc(value, name)} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => file.current?.click()} className="btn-secondary py-1.5 text-xs">
                  <Upload className="h-3.5 w-3.5" /> Upload photo
                </button>
                {value && (
                  <button type="button" onClick={() => save(null)} className="btn-ghost py-1.5 text-xs text-red-600">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
              <input ref={file} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
            <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Or pick an avatar</div>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {AVATAR_STYLES.map((s) => {
                const url = dicebear(name, s);
                return (
                  <button key={s} type="button" onClick={() => save(url)} className={`overflow-hidden rounded-full ring-2 ${value === url ? "ring-brand-500" : "ring-transparent hover:ring-slate-300"}`} title={s}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={s} className="aspect-square w-full" loading="lazy" />
                  </button>
                );
              })}
            </div>
            {err && <p className="mt-3 text-xs font-semibold text-red-600">{err}</p>}
          </div>
        </div>
      )}
    </>
  );
}
