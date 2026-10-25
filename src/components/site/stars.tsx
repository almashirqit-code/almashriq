import { Star } from "lucide-react";

export function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    // role="img" makes the label valid (aria-label isn't allowed on a plain span); the five icons are decoration
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((k) => (
        <Star key={k} aria-hidden className={`${size} ${k <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
      ))}
    </span>
  );
}
