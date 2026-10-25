"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Heart, Trash2, Send, CheckCircle2, AlertCircle, Car } from "lucide-react";
import { useFavorites, toggleFavorite, favKey, visitorId } from "@/lib/favorites-store";
import { InquiryForm } from "@/components/site/inquiry-form";
import { useConsent } from "@/components/site/consent";
import { recordFavorite, requestQuoteForFavorites } from "./actions";

const KIND_LABEL = { vehicle: "Car", part: "Part", machine: "Machine" } as const;

/** Saved items with a single quote request for all of them. */
export function FavouritesList({ signedIn, agent }: { signedIn: boolean; agent: string | null }) {
  const favs = useFavorites();
  const { consent } = useConsent();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; no?: number; error?: string } | null>(null);

  const list = favs.map((f) => `• ${f.stock} — ${f.title}${f.price ? ` (${f.price})` : ""}`).join("\n");
  const message = `Please send me a C&F quotation for these ${favs.length} item${favs.length === 1 ? "" : "s"} from my favourites:\n${list}`;

  function remove(i: (typeof favs)[number]) {
    toggleFavorite(i);
    recordFavorite(i.kind, i.id, "remove", consent?.analytics ? visitorId() : null, i.title).catch(() => {});
  }

  if (!favs.length) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Heart className="mx-auto mb-3 h-10 w-10 text-rose-400" />
        <p className="font-bold">No favourites yet</p>
        <p className="mt-1 text-sm text-white/70">Tap the heart on any car, part or machine to save it here and compare later.</p>
        <Link href="/cars" className="mt-4 inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-brand-700">
          Browse cars
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <ul className="grid gap-3">
        {favs.map((f) => (
          <li key={favKey(f.kind, f.id)} className="glass flex items-center gap-3 rounded-2xl p-3">
            <Link href={f.href} className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-black/5">
              {f.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Car className="m-auto h-full w-8 opacity-40" />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={f.href} className="line-clamp-1 font-bold hover:underline">
                {f.title}
              </Link>
              <div className="text-xs text-white/70">
                {KIND_LABEL[f.kind]} · {f.stock}
              </div>
              {f.price && <div className="text-sm font-black">{f.price}</div>}
            </div>
            <button
              type="button"
              onClick={() => remove(f)}
              aria-label={`Remove ${f.stock} from favourites`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/60 ring-1 ring-white/15 hover:text-brand-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <aside className="glass h-fit rounded-2xl p-5">
        <h2 className="text-lg font-black">Get a quote for your list</h2>
        <p className="mb-4 text-sm text-white/70">
          {signedIn ? `We'll send all ${favs.length} items to ${agent ?? "your sales agent"} in one request.` : "Tell us where to ship and we'll quote everything on your list."}
        </p>
        {signedIn ? (
          result?.ok ? (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-300/40" role="status">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Sent. Your reference is <b>INQ-{result.no}</b>.
            </p>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => setResult(await requestQuoteForFavorites(message)))}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" /> {pending ? "Sending…" : `Request a quote for ${favs.length} item${favs.length === 1 ? "" : "s"}`}
              </button>
              {result?.error && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  <AlertCircle className="h-4 w-4" /> {result.error}
                </p>
              )}
            </>
          )
        ) : (
          <InquiryForm compact source="favorites" defaultMessage={message} />
        )}
      </aside>
    </div>
  );
}
