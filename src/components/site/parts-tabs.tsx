import Link from "next/link";
import { Car, Wrench } from "lucide-react";

/** Parts section tabs: individual spare parts · complete units (cars bought for parts). */
export function PartsTabs({ active, parts, units }: { active: "parts" | "units"; parts: number; units: number }) {
  const tab = (key: "parts" | "units", href: string, icon: React.ReactNode, label: string, n: number) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:flex-none ${
        active === key ? "bg-[var(--accent)] text-white shadow-lg shadow-brand-900/40" : "text-white/85 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {label}
      <span className="rounded-md bg-black/25 px-1.5 py-0.5 text-xs tabular-nums">{n.toLocaleString()}</span>
    </Link>
  );
  return (
    <nav className="glass-lite mt-4 flex gap-1 rounded-2xl p-1 sm:inline-flex" aria-label="Parts">
      {tab("parts", "/parts", <Wrench className="h-4 w-4" />, "Spare parts", parts)}
      {tab("units", "/parts/units", <Car className="h-4 w-4" />, "Complete units", units)}
    </nav>
  );
}
