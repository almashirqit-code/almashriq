import { MessageCircle, Send } from "lucide-react";

/**
 * Phone-only action bar pinned to the bottom of car / part / machine pages:
 * the price plus WhatsApp and "Get quote" (jumps to the #quote form) are always one tap away.
 */
export function StickyContact({ price, wa, sold = false }: { price: string | null; wa: string | null; sold?: boolean }) {
  return (
    <div className="glass-strong fixed inset-x-2 bottom-2 z-50 flex items-center gap-2 rounded-2xl p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="min-w-0 flex-1 pl-2">
        <div className="text-xs font-bold uppercase tracking-wider text-white/60">FOB price</div>
        <div className="truncate text-lg font-black leading-tight">{sold ? "Sold" : price ?? "Ask for price"}</div>
      </div>
      {wa && !sold && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-jet-950 shadow-lg shadow-black/30">
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
      <a href="#quote" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-lg shadow-brand-900/40">
        <Send className="h-4 w-4" /> Get quote
      </a>
    </div>
  );
}
