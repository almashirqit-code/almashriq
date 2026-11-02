import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MessageCircle, Mail, MapPin, Check, CalendarDays, Gauge, Cog, Fuel, Ship, Settings2, Navigation, ShieldCheck, Banknote, FileCheck2 } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { carTitle, getCar, getCompany, getYardPhotos, listCars, makeSlug, priceLabel, whatsapp, SITE_URL } from "@/lib/public-site";
import { Gallery } from "@/components/site/gallery";
import { InquiryForm } from "@/components/site/inquiry-form";
import { JsonLd } from "@/components/site/json-ld";
import { CarCard } from "../../car-card";
import { ShipsFrom } from "@/components/site/ships-from";
import { StickyContact } from "@/components/site/sticky-contact";
import { FavoriteButton } from "@/components/site/favorite-button";
import { branchName } from "@/lib/branches";

export const revalidate = 86400;
// Nothing is built up front: each page is rendered on its first visit, then served from cache until it revalidates.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ stock: string }> }): Promise<Metadata> {
  const { stock } = await params;
  const c = await getCar(decodeURIComponent(stock));
  if (!c) return { title: "Car not found", robots: { index: false } };
  const title = `${[c.year, c.make, c.model, c.grade].filter(Boolean).join(" ")} — ${c.stock_no}`;
  const price = priceLabel(c);
  const description = [
    `Used ${c.year ?? ""} ${c.make} ${c.model} for sale from ${branchName(c.branch ?? "JP")}`.replace(/\s+/g, " "),
    c.mileage != null ? `${c.mileage.toLocaleString()} km` : null,
    c.engine_cc ? `${c.engine_cc}cc` : null,
    c.transmission,
    c.fuel,
    c.steering,
    price ? `FOB ${price}` : "Ask for price",
  ]
    .filter(Boolean)
    .join(" · ");
  const url = `/cars/${encodeURIComponent(c.stock_no)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: c.images.slice(0, 4).map(publicImageUrl) },
  };
}

export default async function PublicCar({ params }: { params: Promise<{ stock: string }> }) {
  const { stock } = await params;
  const [c, company] = await Promise.all([getCar(decodeURIComponent(stock)), getCompany()]);
  if (!c) notFound();
  // Cars bought for parts live under Parts → Complete units.
  if (c.for_parts) permanentRedirect(`/parts/units/${encodeURIComponent(c.stock_no)}`);
  const [relatedRes, yardPaths] = await Promise.all([listCars({ make: c.make, sort: "new" }, 9), getYardPhotos(c.stock_no)]);
  const related = relatedRes.cars.filter((x) => x.id !== c.id).slice(0, 8);
  const yard = yardPaths.map(publicImageUrl);

  const title = carTitle(c);
  const price = priceLabel(c);
  const sold = c.status === "sold" || c.status === "shipped";
  const images = c.images.map(publicImageUrl);
  const wa = whatsapp(company, `Hello, please send me a C&F quotation for ${c.stock_no} ${title}. My destination port is: `, c.stock_no);
  const url = `${SITE_URL}/cars/${encodeURIComponent(c.stock_no)}`;
  const specs: [string, string | number | null][] = [
    ["Stock ID", c.stock_no],
    ["Make", c.make],
    ["Model", c.model],
    ["Grade", c.grade],
    ["Model code", c.model_code],
    ["Registration", c.year ? `${c.year}${c.month ? ` / ${c.month}` : ""}` : null],
    ["Mileage", c.mileage != null ? `${c.mileage.toLocaleString()} km` : null],
    ["Engine", c.engine_cc ? `${c.engine_cc.toLocaleString()} cc` : null],
    ["Fuel", c.fuel],
    ["Transmission", c.transmission],
    ["Drive", c.drive],
    ["Steering", c.steering],
    ["Body type", c.body_type],
    ["Color", c.color],
    ["Doors", c.doors],
    ["Seats", c.seats],
    ["Chassis no.", c.chassis_no],
    ["Location", c.location],
    ["Ships from", branchName(c.branch ?? "JP")],
  ];
  const facts = [
    { icon: CalendarDays, label: "Year", value: c.year ? `${c.year}${c.month ? ` / ${c.month}` : ""}` : "—" },
    { icon: Gauge, label: "Mileage", value: c.mileage != null ? `${c.mileage.toLocaleString()} km` : "—" },
    { icon: Cog, label: "Engine", value: c.engine_cc ? `${c.engine_cc.toLocaleString()} cc` : "—" },
    { icon: Settings2, label: "Gearbox", value: c.transmission ?? "—" },
    { icon: Fuel, label: "Fuel", value: c.fuel ?? "—" },
    { icon: Navigation, label: "Steering", value: c.steering ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Car",
            name: `${c.year ?? ""} ${c.make} ${c.model} ${c.grade ?? ""}`.replace(/\s+/g, " ").trim(),
            sku: c.stock_no,
            url,
            image: images.slice(0, 10),
            brand: { "@type": "Brand", name: c.make },
            model: c.model,
            vehicleModelDate: c.year ? String(c.year) : undefined,
            mileageFromOdometer: c.mileage != null ? { "@type": "QuantitativeValue", value: c.mileage, unitCode: "KMT" } : undefined,
            vehicleEngine: c.engine_cc ? { "@type": "EngineSpecification", engineDisplacement: { "@type": "QuantitativeValue", value: c.engine_cc, unitCode: "CMQ" } } : undefined,
            fuelType: c.fuel ?? undefined,
            vehicleTransmission: c.transmission ?? undefined,
            driveWheelConfiguration: c.drive ?? undefined,
            bodyType: c.body_type ?? undefined,
            color: c.color ?? undefined,
            numberOfDoors: c.doors ?? undefined,
            seatingCapacity: c.seats ?? undefined,
            itemCondition: "https://schema.org/UsedCondition",
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: c.price_currency || "USD",
              price: price ? Number(c.price) : undefined,
              availability: sold ? "https://schema.org/SoldOut" : c.status === "reserved" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
              seller: { "@type": "AutoDealer", name: company.company_name },
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: c.make, item: `${SITE_URL}/makes/${makeSlug(c.make)}` },
              { "@type": "ListItem", position: 3, name: `${c.make} ${c.model} ${c.stock_no}`, item: url },
            ],
          },
        ]}
      />

      <nav className="mb-3 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link> / <Link href={`/makes/${makeSlug(c.make)}`} className="hover:text-brand-700">{c.make}</Link> / {c.model} {c.stock_no}
      </nav>

      {/*
        Phones: gallery → summary → details → quote form (the sticky bar jumps to the form).
        Desktop: gallery | summary, then details | quote form (sticky), so neither column leaves a gap.
      */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Gallery images={images} alt={title} stockNo={c.stock_no} />
        </div>

        <div className="lg:col-start-2 lg:row-start-1">
          <div className="glass-lite rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex whitespace-nowrap rounded-lg bg-white/10 px-2 py-0.5 text-xs font-bold text-white">Stock ID {c.stock_no}</span>
                <Status status={c.status} />
              </span>
              <FavoriteButton variant="pill" item={{ kind: "vehicle", id: c.id, stock: c.stock_no, title, image: images[0] ?? null, price: price ?? null }} />
            </div>
            <h1 className="mt-2 text-2xl font-black leading-snug tracking-tight text-navy-950 sm:text-3xl">{title}</h1>
            {c.grade && <p className="text-slate-500">{c.grade}</p>}
            {/* Key facts buyers compare first, large enough to scan at a glance */}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 border-y border-white/10 py-1 sm:grid-cols-3">
              {facts.map(({ icon: I, label, value }) => (
                <div key={label} className="py-2">
                  <dt className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-white/55">
                    <I aria-hidden className="h-3.5 w-3.5 text-brand-600" />
                    {label}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-extrabold text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-white/70">
              {c.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-brand-600" /> {c.location}
                </span>
              )}
              <ShipsFrom code={c.branch ?? "JP"} />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3 rounded-lg bg-navy-50 p-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-navy-500">FOB price</div>
                <div className="text-3xl font-black text-brand-600">{price ?? "Ask for price"}</div>
              </div>
              <div className="flex items-center gap-1 text-right text-xs text-navy-700">
                <Ship className="h-4 w-4" /> C&F / CIF on request
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-jet-950 shadow-lg shadow-black/25 hover:brightness-110">
                  <MessageCircle className="h-5 w-5" /> WhatsApp
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}?subject=${encodeURIComponent(`Quotation: ${c.stock_no} ${title}`)}`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold ring-1 ring-white/20 hover:bg-white/15"
                >
                  <Mail className="h-4 w-4" /> Email us
                </a>
              )}
            </div>
            <ul className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs text-white/70 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, t: "Real photos & honest specs" },
                { icon: Banknote, t: "Secure bank transfer (TT)" },
                { icon: FileCheck2, t: "Documents sent by DHL" },
              ].map(({ icon: I, t }) => (
                <li key={t} className="flex items-center gap-1.5">
                  <I aria-hidden className="h-4 w-4 shrink-0 text-brand-600" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          {yard.length > 0 && (
            <section aria-labelledby="yard-photos">
              <h2 id="yard-photos" className="mb-1 flex items-center gap-2 text-lg font-extrabold">
                <span className="h-5 w-1 rounded-full bg-[var(--accent)]" />
                In-yard photos
              </h2>
              <p className="mb-3 text-sm text-white/65">Taken at our yard in Japan — the car as it is now, before shipping.</p>
              <Gallery images={yard} alt={`${title} at our yard`} stockNo={`${c.stock_no}-yard`} />
            </section>
          )}

          <section className="glass-lite overflow-hidden rounded-3xl">
            <h2 className="border-b border-white/10 px-5 py-3.5 font-extrabold">Specifications</h2>
            <dl className="grid sm:grid-cols-2">
              {specs
                .filter(([, v]) => v != null && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-slate-100 px-5 py-2.5 text-sm sm:odd:border-r">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-semibold text-slate-900">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {c.features.length > 0 && (
            <section className="glass-lite overflow-hidden rounded-3xl">
              <h2 className="border-b border-white/10 px-5 py-3.5 font-extrabold">Features</h2>
              <div className="flex flex-wrap gap-2 p-5">
                {c.features.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    <Check className="h-3.5 w-3.5" />
                    {f}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <div id="quote" className="glass-lite scroll-mt-20 rounded-3xl p-5 lg:sticky lg:top-24">
            <h2 className="mb-3 text-lg font-black text-navy-950">Get a quotation for this car</h2>
            <InquiryForm
              stockNo={c.stock_no}
              source="car_page"
              compact
              defaultMessage={`Please send me a C&F quotation for ${c.stock_no} ${title}.`}
            />
            <p className="mt-3 text-center text-sm">
              Already a customer?{" "}
              <Link href={`/account/inquiries?stock=${encodeURIComponent(c.stock_no)}`} className="font-bold text-brand-700 hover:underline">
                Ask your agent from your account →
              </Link>
            </p>
          </div>
        </div>
      </div>

      <StickyContact price={price} wa={wa} />

      {related.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <span className="h-6 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-rose-300" />
              More {c.make} in stock
            </h2>
            <Link href={`/makes/${makeSlug(c.make)}`} className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--accent-text)] hover:underline">
              View all {c.make}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <CarCard key={r.id} c={r} wa={whatsapp(company, `Hello, I'm interested in ${r.stock_no} ${carTitle(r)}.`, r.stock_no)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Status({ status }: { status: string }) {
  const s =
    status === "sold" || status === "shipped"
      ? { t: "Sold", c: "bg-slate-200 text-slate-700" }
      : status === "reserved"
        ? { t: "Reserved", c: "bg-amber-100 text-amber-800" }
        : { t: "Available", c: "bg-emerald-100 text-emerald-800" };
  return <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${s.c}`}>{s.t}</span>;
}
