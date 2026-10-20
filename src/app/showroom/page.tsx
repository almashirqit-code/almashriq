import type { Metadata } from "next";
import { Car, Mail, Phone, ImageIcon } from "lucide-react";
import { getShowroom } from "@/lib/showroom";
import { getT } from "@/lib/i18n/server";
import { money, num, publicImageUrl } from "@/lib/format";
import type { DictKey } from "@/lib/i18n/dictionaries";
import { LanguageToggle } from "@/components/language-toggle";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { company } = await getShowroom();
  const name = company?.company_name ?? "Al Mashriq";
  return { title: `${name} — Vehicles for sale`, description: `Used vehicles from Japan available from ${name}.` };
}

export default async function ShowroomPage() {
  const { t, locale } = await getT();
  const { vehicles, company } = await getShowroom();
  const name = (locale === "ja" && company?.company_name_ja) || company?.company_name || "Al Mashriq";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt="" className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Car className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="font-semibold text-slate-900">{name}</div>
              <div className="text-xs text-slate-500">{t("showroom_subtitle")}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {company?.phone && (
              <a href={`tel:${company.phone}`} className="hidden items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700 sm:flex">
                <Phone className="h-4 w-4" />
                {company.phone}
              </a>
            )}
            <LanguageToggle locale={locale} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("showroom_title")}</h1>
          <p className="text-sm text-slate-500">{t("showroom_count", { count: num(vehicles.length, locale) })}</p>
        </div>

        {vehicles.length === 0 ? (
          <div className="card px-6 py-16 text-center text-slate-500">{t("showroom_empty")}</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => {
              const title = [v.year, v.make, v.model].filter(Boolean).join(" ");
              const specs = [
                v.mileage != null ? `${num(v.mileage, locale)} km` : null,
                v.engine_cc ? `${num(v.engine_cc, locale)} cc` : null,
                v.transmission,
                v.fuel,
                v.steering,
              ].filter(Boolean);
              const subject = encodeURIComponent(`${v.stock_no} — ${title}`);
              return (
                <article key={v.id} className="card flex flex-col overflow-hidden">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {v.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={publicImageUrl(v.images[0])} alt={title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                    )}
                    {v.status === "reserved" && (
                      <span className="absolute left-3 top-3 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {t(`vs_${v.status}` as DictKey)}
                      </span>
                    )}
                    {v.for_parts && (
                      <span className="absolute right-3 top-3 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                        🔧 {t("parts_badge")}
                      </span>
                    )}
                    {v.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                        {v.images.length} 📷
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="text-xs font-medium text-slate-400">{v.stock_no}</div>
                    <h2 className="mt-0.5 font-semibold text-slate-900">{title}</h2>
                    {v.grade && <div className="text-sm text-slate-500">{v.grade}</div>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {specs.map((s) => (
                        <span key={String(s)} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {s}
                        </span>
                      ))}
                      {v.color && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{v.color}</span>}
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                      <div className="text-lg font-semibold text-brand-700">
                        {v.price != null ? money(v.price, v.price_currency, locale) : <span className="text-sm text-slate-500">{t("showroom_price_on_request")}</span>}
                      </div>
                      {company?.email && (
                        <a href={`mailto:${company.email}?subject=${subject}`} className="btn-secondary py-1.5 text-xs">
                          <Mail className="h-3.5 w-3.5" />
                          {t("showroom_inquire")}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {(company?.email || company?.phone || company?.address) && (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-600 lg:px-8">
            <div className="font-medium text-slate-900">{t("showroom_contact")}</div>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
              {company?.phone && <span>{company.phone}</span>}
              {company?.email && <a href={`mailto:${company.email}`} className="hover:text-brand-700">{company.email}</a>}
              {company?.address && <span className="whitespace-pre-line">{company.address}</span>}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
