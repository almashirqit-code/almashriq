import { SlidersHorizontal, X } from "lucide-react";

/**
 * Filters for the list pages.
 *  • phones: a sticky "Filters (n)" bar; the form opens as a frosted bottom sheet. It's driven by the URL
 *    hash (#filters), so it needs no JavaScript and the phone's Back button closes it.
 *  • desktop (lg+): the same form is a normal sticky sidebar.
 * Put <FilterToolbar> above the results grid and <FilterPanel> in the sidebar column.
 */
export function FilterToolbar({ count, children }: { count: number; children?: React.ReactNode }) {
  return (
    <div className="glass-strong sticky top-[4.25rem] z-30 -mx-4 mb-3 flex items-center gap-2 rounded-none border-x-0 px-4 py-2 lg:hidden">
      <a href="#filters" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-bold ring-1 ring-white/15 hover:bg-white/15">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {count > 0 && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs leading-none">{count}</span>}
      </a>
      {children}
    </div>
  );
}

/**
 * `sticky`: keep the panel pinned while scrolling on desktop. Only for sidebars where the panel is the
 * only box (car list) — with more boxes below it (categories, inquiry form) they would slide under the
 * translucent panel and show through.
 */
export function FilterPanel({ children, sticky = false }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <div id="filters" className={`filter-panel lg:block ${sticky ? "lg:sticky lg:top-20" : ""}`}>
      <a href="#results" aria-label="Close filters" tabIndex={-1} className="absolute inset-0 bg-black/60 lg:hidden" />
      <div className="filter-sheet glass-strong absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:static lg:max-h-none lg:overflow-visible lg:rounded-2xl">
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <h2 className="flex items-center gap-2 text-base font-black">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </h2>
          <a href="#results" aria-label="Close filters" className="flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10">
            <X className="h-5 w-5" />
          </a>
        </div>
        <div className="mb-3 hidden items-center gap-2 text-sm font-extrabold lg:flex">
          <SlidersHorizontal className="h-4 w-4" /> Search filters
        </div>
        {children}
      </div>
    </div>
  );
}

/** Submit button that stays visible at the bottom of the phone sheet. */
export function FilterSubmit({ label = "Show results" }: { label?: string }) {
  return (
    <div className="sticky -bottom-4 -mx-4 bg-gradient-to-t from-[#111114] via-[#111114]/95 to-transparent px-4 pb-2 pt-4 lg:static lg:mx-0 lg:bg-none lg:p-0">
      <button className="h-12 w-full rounded-xl bg-[var(--accent)] text-sm font-bold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-700">{label}</button>
    </div>
  );
}
