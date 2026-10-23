/** Which listing statuses get a public tag: sold (or shipped) and reserved. */
export function statusTag(status: string | null | undefined): "sold" | "reserved" | null {
  if (status === "sold" || status === "shipped") return "sold";
  if (status === "reserved") return "reserved";
  return null;
}

/**
 * SOLD / RESERVED tag for a photo on a public card (cars, parts, units, machinery): a diagonal ribbon in
 * the top-right corner plus a solid strip along the bottom. Place inside the photo's `relative overflow-hidden` box.
 */
export function StatusTag({ status }: { status: string | null | undefined }) {
  const tag = statusTag(status);
  if (!tag) return null;
  const sold = tag === "sold";
  const label = sold ? "Sold" : "Reserved";
  // Full class names so Tailwind generates them.
  const bg = sold ? "bg-brand-600" : "bg-amber-500";
  const strip = sold ? "bg-brand-600/95" : "bg-amber-500/95";
  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute right-[-42px] top-[14px] z-10 w-[150px] rotate-45 py-1 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-black/25 ${bg}`}
      >
        {label}
      </span>
      <span className={`absolute inset-x-0 bottom-0 z-10 py-1 text-center text-xs font-black uppercase tracking-widest text-white ${strip}`}>{label}</span>
    </>
  );
}
