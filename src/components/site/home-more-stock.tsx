import Link from "next/link";
import { ArrowRight, Car, Tractor, Wrench } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { listMachinery, listPartUnits, listParts, priceLabel } from "@/lib/public-site";
import { UNIT_PART_LABEL, type UnitPart } from "@/lib/part-units";

type Tile = { key: string; href: string; img: string | null; badge: string; title: string; sub: string | null; at: string };

/**
 * Home page: spare parts, complete units (cars for parts) and heavy machinery — a tile per section
 * with its live count, then a swipe row of the newest items from all three.
 */
export async function HomeMoreStock() {
  const [parts, units, machines] = await Promise.all([listParts({}, 6), listPartUnits({}, 6), listMachinery({ sort: "new" }, 6)]);

  const sections = [
    { href: "/parts", icon: Wrench, title: "Spare parts", text: "Engines, gearboxes, body parts and lights — used & new.", n: parts.total },
    { href: "/parts/units", icon: Car, title: "Half cuts & complete units", text: "Half cuts, nose cuts and parts from cars we dismantle.", n: units.total },
    { href: "/machinery", icon: Tractor, title: "Heavy machinery", text: "Excavators, loaders, tractors, cranes and forklifts.", n: machines.total },
  ];

  const tiles: Tile[] = [
    ...parts.parts.map((p) => ({
      key: `p${p.id}`,
      href: `/parts/${encodeURIComponent(p.part_no)}`,
      img: p.images?.[0] ?? p.cover,
      badge: "Spare part",
      title: p.name,
      sub: priceLabel(p) ?? [p.make, p.model].filter(Boolean).join(" ") ?? null,
      at: p.created_at,
    })),
    ...units.units.map((u) => ({
      key: `u${u.id}`,
      href: `/parts/units/${encodeURIComponent(u.stock_no)}`,
      img: u.images?.[0] ?? u.cover,
      badge: "Parts car",
      title: [u.year, u.make, u.model].filter(Boolean).join(" "),
      sub: u.unit_parts.slice(0, 3).map((p) => UNIT_PART_LABEL[p as UnitPart] ?? p).join(" · ") || null,
      at: u.created_at,
    })),
    ...machines.machines.map((m) => ({
      key: `m${m.id}`,
      href: `/machinery/${encodeURIComponent(m.stock_no)}`,
      img: m.images?.[0] ?? m.cover,
      badge: m.category || "Machinery",
      title: [m.year, m.make, m.model].filter(Boolean).join(" "),
      sub: priceLabel(m) ?? (m.hours != null ? `${m.hours.toLocaleString()} h` : null),
      at: m.created_at,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black sm:text-2xl">
          <span className="h-6 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
          Parts, half cuts & machinery
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {sections.map(({ href, icon: I, title, text, n }) => (
          <Link key={href} href={href} className="glass-lite glass-hover group flex items-start gap-3 rounded-2xl p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-lg shadow-brand-900/40">
              <I className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2 font-bold">
                {title}
                <ArrowRight className="h-4 w-4 shrink-0 text-white/50 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </span>
              <span className="block text-sm text-white/65">{text}</span>
              <span className="mt-1 block text-xs font-bold text-[var(--accent-text)]">{n > 0 ? `${n.toLocaleString()} in stock` : "Ask us — we source to order"}</span>
            </span>
          </Link>
        ))}
      </div>

      {tiles.length > 0 && (
        <div className="hscroll mt-4">
          {tiles.map((t) => (
            <Link key={t.key} href={t.href} className="glass-lite glass-hover group w-52 shrink-0 overflow-hidden rounded-2xl sm:w-60">
              <div className="relative aspect-[4/3] bg-black/20">
                {t.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicImageUrl(t.img)} alt={t.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/25">
                    <Wrench className="h-10 w-10" />
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">{t.badge}</span>
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-bold">{t.title}</div>
                {t.sub && <div className="truncate text-xs text-white/60">{t.sub}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
