"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's favourites, kept in the browser (localStorage) so hearts work without an account.
 * Signed-in customers' lists are also synced to their account (FavoritesSync + record_favorite).
 */
export type FavKind = "vehicle" | "part" | "machine";
export type Fav = { kind: FavKind; id: string; stock: string; title: string; href: string; image?: string | null; price?: string | null; at: number };

const KEY = "am_favs";
const listeners = new Set<() => void>();
let cache: Fav[] | null = null;
const EMPTY: Fav[] = [];

function load(): Fav[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(v) ? (v as Fav[]).filter((f) => f && f.id && f.kind).slice(0, 200) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(list: Fav[]) {
  cache = list.slice(0, 200);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked */
  }
  listeners.forEach((l) => l());
}

export const favKey = (kind: FavKind, id: string) => `${kind}:${id}`;

export function getFavorites() {
  return load();
}

export function setFavorites(list: Fav[]) {
  save(list);
}

/** Adds or removes; returns true when the item is now saved. */
export function toggleFavorite(f: Omit<Fav, "at">): boolean {
  const list = load();
  const k = favKey(f.kind, f.id);
  if (list.some((x) => favKey(x.kind, x.id) === k)) {
    save(list.filter((x) => favKey(x.kind, x.id) !== k));
    return false;
  }
  save([{ ...f, at: Date.now() }, ...list]);
  return true;
}

export function useFavorites(): Fav[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
          cache = null;
          cb();
        }
      };
      window.addEventListener("storage", onStorage); // keep other tabs in step
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    load,
    () => EMPTY,
  );
}

/** Random browser id for counting interest; only used when the visitor allowed analytics. */
export function visitorId(): string | null {
  try {
    let v = localStorage.getItem("am_vid");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("am_vid", v);
    }
    return v;
  } catch {
    return null;
  }
}

export const favHref = (kind: FavKind, stock: string) =>
  kind === "part" ? `/parts/${encodeURIComponent(stock)}` : kind === "machine" ? `/machinery/${encodeURIComponent(stock)}` : `/cars/${encodeURIComponent(stock)}`;
