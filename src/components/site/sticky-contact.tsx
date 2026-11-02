import { MessageCircle, Send } from "lucide-react";
import { QuoteSheet, QuoteSheetButton } from "./quote-form";

/**
 * Phone-only action bar pinned to the bottom of car / part / machine pages (frosted glass, like the
 * bottom tab bar): the price plus WhatsApp and "Get quote" are always one tap away. With `quote`,
 * "Get quote" opens the quote sheet over the page; otherwise it jumps to the #quote form.
 */
export function StickyContact({ price, wa, quote }: { price: string | null; wa: string | null; quote?: { stockNo: string; title: string } }) {
  const btn = "inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-lg shadow-brand-900/25";
  return (
    <>
      <div className="glass-strong glass-bar fixed inset-x-2 bottom-2 z-50 flex items-center gap-2 rounded-2xl p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="min-w-0 flex-1 pl-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">FOB price</div>
          <div className="truncate text-lg font-black leading-tight text-navy-950">{price ?? "Ask for price"}</div>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" aria-label="Ask on WhatsApp" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-jet-950 shadow-lg shadow-black/15">
            <MessageCircle className="h-6 w-6" />
          </a>
        )}
        {quote ? (
          <QuoteSheetButton className={btn}>
            <Send className="h-4 w-4" /> Get quote
          </QuoteSheetButton>
        ) : (
          <a href="#quote" className={btn}>
            <Send className="h-4 w-4" /> Get quote
          </a>
        )}
      </div>
      {quote && <QuoteSheet stockNo={quote.stockNo} title={quote.title} wa={wa} />}
    </>
  );
}
