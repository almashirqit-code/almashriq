"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Heart } from "lucide-react";
import { favHref, favKey, getFavorites, setFavorites, toggleFavorite, useFavorites, visitorId, type Fav, type FavKind } from "@/lib/favorites-store";
import { recordFavorite, mergeFavorites } from "@/app/(site)/favourites/actions";
import { useConsent } from "./consent";

type Item = { kind: FavKind; id: string; stock: string; title: string; image?: string | null; price?: string | null };

/** Heart toggle for a car, part or machine. Saves in the browser at once; the click is recorded in the background. */
export function FavoriteButton({ item, variant = "icon" }: { item: Item; variant?: "icon" | "pill" }) {
  const favs = useFavorites();
  const { consent } = useConsent();
  const saved = favs.some((f) => favKey(f.kind, f.id) === favKey(item.kind, item.id));

  function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavorite({ ...item, href: favHref(item.kind, item.stock) });
    // Count interest; an anonymous id is only attached when the visitor allowed analytics.
    recordFavorite(item.kind, item.id, added ? "add" : "remove", consent?.analytics ? visitorId() : null, item.title).catch(() => {});
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (added && consent?.analytics && w.gtag) w.gtag("event", "add_to_wishlist", { items: [{ item_id: item.stock, item_name: item.title, item_category: item.kind }] });
  }

  const label = saved ? `Remove ${item.stock} from favourites` : `Save ${item.stock} to favourites`;
  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={click}
        aria-pressed={saved}
        aria-label={label}
        className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ring-1 transition ${
          saved ? "bg-rose-50 text-rose-700 ring-rose-300" : "ring-current/20 hover:bg-black/5"
        }`}
      >
        <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={click}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Saved — tap to remove" : "Save to favourites"}
      className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition ${
        saved ? "bg-rose-50 text-rose-600 ring-rose-300" : "text-white/70 ring-white/15 hover:text-rose-600 hover:ring-rose-300"
      }`}
    >
      <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}

/** Header link with the number of saved items. */
export function FavoritesLink({ className = "" }: { className?: string }) {
  const n = useFavorites().length;
  return (
    <Link href="/favourites" aria-label={`Favourites${n ? `, ${n} saved` : ""}`} className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${className}`}>
      <Heart className={`h-5 w-5 ${n ? "fill-rose-500 text-rose-500" : ""}`} />
      {n > 0 && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand-600 px-1 text-center text-[11px] font-bold leading-5 text-white">{n > 99 ? "99+" : n}</span>
      )}
    </Link>
  );
}

/**
 * For signed-in customers, merges the browser list with the account once per visit, so favourites
 * follow them across devices. Does nothing for visitors without a sign-in session.
 */
export function FavoritesSync() {
  useEffect(() => {
    try {
      if (!/sb-[^=]*-auth-token/.test(document.cookie) || sessionStorage.getItem("am_favs_synced")) return;
      sessionStorage.setItem("am_favs_synced", "1");
    } catch {
      return;
    }
    const local = getFavorites();
    mergeFavorites(local.map((f) => ({ kind: f.kind, id: f.id, title: f.title })))
      .then((server) => {
        if (!server) return;
        const have = new Map(local.map((f) => [favKey(f.kind, f.id), f]));
        const merged: Fav[] = server.map((s) => {
          const k = favKey(s.item_kind, s.item_id);
          return (
            have.get(k) ?? {
              kind: s.item_kind,
              id: s.item_id,
              stock: s.stock_no ?? "",
              title: s.title || s.stock_no || "Saved item",
              href: favHref(s.item_kind, s.stock_no ?? ""),
              at: Date.parse(s.created_at) || Date.now(),
            }
          );
        });
        setFavorites(merged);
      })
      .catch(() => {});
  }, []);
  return null;
}
