import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Mail, MapPin, Check, ChevronLeft, CalendarDays, Gauge, Cog, Fuel } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { carTitle, getCar, getCompany, priceLabel, siteBase, whatsapp } from "@/lib/public-site";
import { Gallery } from "../../gallery";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ stock: string }> }): Promise<Metadata> {
  const { stock } = await params;
  const c = await getCar(decodeURIComponent(stock));
  if (!c) return { title: "Car not found" };
  const title = `${carTitle(c)} — ${c.stock_no}`;
  return {
    title: { absolute: `${title} | Al Mashriq` },
    description: [c.grade, c.mileage != null ? `${c.mileage.toLocaleString()} km` : null, c.engine_cc ? `${c.engine_cc}cc` : null, c.transmission, c.fuel].filter(Boolean).join(" · "),
    openGraph: { title, images: c.images[0] ? [publicImageUrl(c.images[0])] : [] },
  };
}

export default async function PublicCar({ params }: { params: Promise<{ stock: string }> }) {
  const { stock } = await params;
  const [c, company, base] = await Promise.all([getCar(decodeURIComponent(stock)), getCompany(), siteBase()]);
  if (!c) notFound();

  const title = carTitle(c);
  const price = priceLabel(c);
  const sold = c.status === "sold";
  const wa = whatsapp(company, `Hello, please send me a C&F quotation for ${c.stock_no} ${title}. My destination port is: `);
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
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <Link href={`${base}/cars`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-700">
        <ChevronLeft className="h-4 w-4" /> All cars
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <Gallery images={c.images.map(publicImageUrl)} alt={title} ribbon={sold ? "sold" : c.status === "reserved" ? "reserved" : null} />

        <div className="space-y-5">
          <div>
            <span className="inline-flex rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">{c.stock_no}</span>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
            {c.grade && <p className="text-slate-500">{c.grade}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {c.year && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                  <CalendarDays className="h-3.5 w-3.5 text-rose-500" />
                  {c.year}
                </span>
              )}
              {c.mileage != null && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                  <Gauge className="h-3.5 w-3.5 text-rose-500" />
                  {c.mileage.toLocaleString()} km
                </span>
              )}
              {(c.engine_cc || c.transmission) && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                  <Cog className="h-3.5 w-3.5 text-violet-500" />
                  {[c.engine_cc ? `${c.engine_cc}cc` : null, c.transmission].filter(Boolean).join(" · ")}
                </span>
              )}
              {c.fuel && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                  <Fuel className="h-3.5 w-3.5 text-sky-500" />
                  {c.fuel}
                </span>
              )}
              {c.location && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                  <MapPin className="h-3.5 w-3.5 text-cyan-500" />
                  {c.location}
                </span>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1024] via-[#1a1240] to-[#2a0f2a] p-6 text-white shadow-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-500/30 blur-3xl" />
            <div className="relative text-xs font-bold uppercase tracking-[0.2em] text-white/60">FOB price</div>
            <div className="relative mt-1 text-4xl font-black">{sold ? "Sold" : price ?? "Ask for price"}</div>
            {!sold && <p className="relative mt-1 text-sm text-white/70">Tell us your destination port for a full C&F / CIF quotation.</p>}
            {!sold && (
              <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-green-600 px-4 py-3 text-sm font-bold shadow-lg shadow-emerald-500/30">
                    <MessageCircle className="h-4 w-4" />
                    Get a quotation
                  </a>
                )}
                {company.email && (
                  <a
                    href={`mailto:${company.email}?subject=${encodeURIComponent(`Quotation: ${c.stock_no} ${title}`)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold ring-1 ring-white/20 hover:bg-white/15"
                  >
                    <Mail className="h-4 w-4" />
                    Email us
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <h2 className="border-b border-slate-100 px-6 py-4 font-extrabold">Specifications</h2>
          <dl className="grid sm:grid-cols-2">
            {specs
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-100 px-6 py-3 text-sm sm:odd:border-r">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
          </dl>
        </section>
        {c.features.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
            <h2 className="font-extrabold">Features</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.features.map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <Check className="h-3.5 w-3.5" />
                  {f}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
