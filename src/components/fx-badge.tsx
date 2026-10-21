import type { Fx } from "@/lib/fx";

/** "USD/JPY 151.23" with source and date in the tooltip. */
export function FxBadge({ fx, className = "", showMillion = false }: { fx: Fx | null; className?: string; showMillion?: boolean }) {
  if (!fx) return null;
  return (
    <span className={`whitespace-nowrap ${className}`} title={`1 USD = ${fx.rate.toFixed(2)} JPY · ${fx.source} · ${fx.date}`}>
      USD/JPY <b>{fx.rate.toFixed(2)}</b>
      {showMillion && <span className="opacity-70"> · ¥1M ≈ ${Math.round(1_000_000 / fx.rate).toLocaleString()}</span>}
    </span>
  );
}
