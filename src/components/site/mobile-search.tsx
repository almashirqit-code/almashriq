"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

/** Phone search: an icon in the top bar that drops a full-width search field under it (the logo keeps its room). */
export function MobileSearch() {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close search" : "Search cars"}
        aria-expanded={open}
        aria-controls="mobile-search"
        className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10 lg:hidden"
      >
        {open ? <X className="h-6 w-6" /> : <Search className="h-6 w-6" />}
      </button>
      {open && (
        <form id="mobile-search" action="/cars" role="search" className="glass-strong absolute inset-x-0 top-full rounded-none border-x-0 border-t-0 p-3 lg:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input ref={input} name="q" placeholder="Make, model or stock ID" aria-label="Search cars" className="h-11 w-full !rounded-xl pl-9 pr-24" enterKeyHint="search" />
            <button type="submit" className="absolute right-1 top-1 bottom-1 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white">
              Search
            </button>
          </div>
        </form>
      )}
    </>
  );
}
