import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Mail, CalendarDays, Gauge, Cog, Fuel, Wrench } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { getCompany, getPartUnit, priceLabel, whatsapp, SITE_URL } from "@/lib/public-site";
import { UNIT_CONDITION_LABEL, UNIT_CUTS, UNIT_PART_LABEL, type UnitCondition, type UnitPart } from "@/lib/part-units";
import { branchName } from "@/lib/branches";
import { Gallery } from "@/components/site/gallery";
import { InquiryForm } from "@/components/site/inquiry-form";
import { JsonLd } from "@/components/site/json-ld";
import { ShipsFrom } from "@/components/site/ships-from";
import { StickyContact } from "@/components/site/sticky-contact";

export const revalidate = 60;
// Nothing is built up front: each page is rendered on its first visit, then served from cache until it revalidates.
export async function generateStaticParams() {
  return [];
}

const label = (p: string) => UNIT_PART_LABEL[p as UnitPart] ?? p;

export async function generateMetadata({ params }: { params: Promise<{ stock: string }> }): Promise<Metadata> {
  const { stock } = await params;
  const u = await getPartUnit(decodeURIComponent(stock));
  if (!u) return { title: "Unit not found", robots: { index: false } };
  const name = [u.year, u.make, u.model].filter(Boolean).join(" ");
  const title = `${name}${u.model_code ? ` ${u.model_code}` : ""} for parts — ${u.stock_no}`;
  const parts = u.unit_parts.map(label);
  const description = [
    `${name} complete unit for parts from ${branchName(u.branch ?? "JP")}`,
    parts.length ? `Available: ${parts.slice(0, 6).join(", ")}` : null,
    u.engine_cc ? `${u.engine_cc}cc` : null,
    u.transmission,
  ]
    .filter(Boolean)
    .join(" · ");
  const url = `/parts/units/${encodeURIComponent(u.stock_no)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images: u.images.slice(0, 4).map(publicImageUrl) } };
}

export default async function PartUnitPage({ params }: { params: Promise<{ stock: string }> }) {
  const { stock } = await params;
  const [u, company] = await Promise.all([getPartUnit(decodeURIComponent(stock)), getCompany()]);
  if (!u) notFound();

  const name = [u.year, u.make, u.model].filter(Boolean).join(" ");
  const images = u.images.map(publicImageUrl);
  const sold = u.status === "sold" || u.status === "shipped";
  const price = priceLabel(u);
  const url = `${SITE_URL}/parts/units/${encodeURIComponent(u.stock_no)}`;
  const ref = `${u.stock_no} ${name}${u.model_code ? ` (${u.model_code})` : ""}`;
  const wa = whatsapp(company, `Hello Al Mashriq, I'm interested in parts from unit ${ref}. I need: `);
  const askFor = (part: string) => whatsapp(company, `Hello Al Mashriq, please quote the ${label(part).toLowerCase()} from unit ${ref}. My destination port is: `);
  const cuts = u.unit_parts.filter((p) => UNIT_CUTS.includes(p as UnitPart));
  const others = u.unit_parts.filter((p) => !UNIT_CUTS.includes(p as UnitPart));
  const condition = u.unit_condition ? UNIT_CONDITION_LABEL[u.unit_condition as UnitCondition] ?? u.unit_condition : null;
  const specs: [string, string | number | null][] = [
    ["Stock ID", u.stock_no],
    ["Make", u.make],
    ["Model", u.model],
    ["Grade", u.grade],
    ["Model code", u.model_code],
    ["Year", u.year ? `${u.year}${u.month ? ` / ${u.month}` : ""}` : null],
    ["Mileage", u.mileage != null ? `${u.mileage.toLocaleString()} km` : null],
    ["Engine", u.engine_cc ? `${u.engine_cc.toLocaleString()} cc` : null],
    ["Fuel", u.fuel],
    ["Transmission", u.transmission],
    ["Drive", u.drive],
    ["Steering", u.steering],
    ["Body type", u.body_type],
    ["Color", u.color],
    ["Chassis no.", u.chassis_no],
    ["Condition", condition],
    ["Location", u.location],
    ["Ships from", branchName(u.branch ?? "JP")],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: `${name} for parts`,
            sku: u.stock_no,
            url,
            image: images.slice(0, 10),
            brand: { "@type": "Brand", name: u.make },
            category: "Used auto parts",
            description: u.unit_parts.length ? `Complete unit for parts. Available: ${u.unit_parts.map(label).join(", ")}.` : "Complete unit for parts.",
            itemCondition: "https://schema.org/UsedCondition",
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: u.price_currency || "USD",
              price: price ? Number(u.price) : undefined,
              availability: sold ? "https://schema.org/SoldOut" : u.status === "reserved" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
              seller: { "@type": "AutoDealer", name: company.company_name },
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Parts", item: `${SITE_URL}/parts` },
              { "@type": "ListItem", position: 3, name: "Complete units", item: `${SITE_URL}/parts/units` },
              { "@type": "ListItem", position: 4, name: `${u.make} ${u.model} ${u.stock_no}`, item: url },
            ],
          },
        ]}
      />

      <nav className="mb-3 text-xs text-white/60" aria-label="Breadcrumb">
        <Link href="/" className="inline-block py-2 hover:text-white">Home</Link> / <Link href="/parts" className="inline-block py-2 hover:text-white">Parts</Link> /{" "}
        <Link href="/parts/units" className="inline-block py-2 hover:text-white">Complete units</Link> / {u.stock_no}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Gallery images={images} alt={`${name} for parts`} stockNo={u.stock_no} ribbon={sold ? "sold" : u.status === "reserved" ? "reserved" : null} />

        <div className="space-y-4">
          <div className="glass-lite rounded-3xl p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-lg bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">Parts car</span>
              <span className="inline-flex rounded-lg bg-white/10 px-2 py-0.5 text-xs font-bold text-white">Stock ID {u.stock_no}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{name}</h1>
            <p className="text-white/65">{[u.grade, u.model_code].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {condition && <Chip icon={Wrench}>{condition}</Chip>}
              {u.year && <Chip icon={CalendarDays}>{u.year}</Chip>}
              {u.mileage != null && <Chip icon={Gauge}>{u.mileage.toLocaleString()} km</Chip>}
              {(u.engine_cc || u.transmission) && <Chip icon={Cog}>{[u.engine_cc ? `${u.engine_cc}cc` : null, u.transmission].filter(Boolean).join(" · ")}</Chip>}
              {u.fuel && <Chip icon={Fuel}>{u.fuel}</Chip>}
              <span className="rounded-lg bg-white/10 px-2.5 py-1">
                <ShipsFrom code={u.branch ?? "JP"} />
              </span>
            </div>
            {price && !sold && (
              <div className="mt-4 rounded-lg bg-white/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-white/60">Whole unit</div>
                <div className="text-3xl font-black text-[var(--accent-text)]">{price}</div>
              </div>
            )}
            {!sold && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-jet-950 shadow-lg shadow-black/25 hover:brightness-110">
                    <MessageCircle className="h-5 w-5" /> Ask for parts
                  </a>
                )}
                {company.email && (
                  <a
                    href={`mailto:${company.email}?subject=${encodeURIComponent(`Parts from unit ${ref}`)}`}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold ring-1 ring-white/20 hover:bg-white/15"
                  >
                    <Mail className="h-4 w-4" /> Email us
                  </a>
                )}
              </div>
            )}
          </div>

          {u.unit_parts.length > 0 && !sold && (
            <section className="glass-lite rounded-3xl p-5">
              <h2 className="font-black">Available from this unit</h2>
              <p className="mt-0.5 text-sm text-white/60">We dismantle to order. Tap a cut or part to ask for a price.</p>
              {[
                { title: "Cuts", list: cuts },
                { title: "Parts", list: others },
              ]
                .filter((g) => g.list.length)
                .map((g) => (
                  <div key={g.title} className="mt-4">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">{g.title}</div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {g.list.map((p) => {
                        const link = askFor(p);
                        return (
                          <li key={p}>
                            {link ? (
                              <a href={link} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-white/5 px-3.5 text-sm font-bold ring-1 ring-white/10 hover:bg-white/10">
                                {label(p)}
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                  <MessageCircle className="h-3.5 w-3.5" /> Ask
                                </span>
                              </a>
                            ) : (
                              <a href="#quote" className="flex min-h-12 items-center rounded-xl bg-white/5 px-3.5 text-sm font-bold ring-1 ring-white/10 hover:bg-white/10">
                                {label(p)}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
            </section>
          )}

          <div id="quote" className="glass-lite scroll-mt-20 rounded-3xl p-5">
            <h2 className="mb-3 text-lg font-black">{sold ? "Looking for a similar unit?" : "Ask for parts from this unit"}</h2>
            <InquiryForm
              stockNo={u.stock_no}
              source="parts"
              compact
              defaultMessage={sold ? `I'm looking for a unit similar to ${ref}.` : `Please quote parts from unit ${ref}. I need: `}
            />
          </div>
        </div>
      </div>

      <section className="glass-lite mt-6 overflow-hidden rounded-3xl lg:w-[58%]">
        <h2 className="border-b border-white/10 px-5 py-3.5 font-extrabold">Specifications</h2>
        <dl className="grid sm:grid-cols-2">
          {specs
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-white/10 px-5 py-2.5 text-sm sm:odd:border-r">
                <dt className="text-white/60">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
        </dl>
      </section>

      <StickyContact price={price} wa={wa} sold={sold} />
    </div>
  );
}

function Chip({ icon: I, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
      <I className="h-3.5 w-3.5 text-[var(--accent-text)]" />
      {children}
    </span>
  );
}
