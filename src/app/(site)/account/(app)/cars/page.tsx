import type { Metadata } from "next";
import { Car, Ship, Package, FileText, Download, ExternalLink } from "lucide-react";
import { publicImageUrl } from "@/lib/format";
import { requireActivePortal, getPortalVehicles, getPortalDocuments, SHIPPING_STATUS, DOC_KIND_LABEL, fmtDate } from "@/lib/portal";
import { Card, Pill, Field, EmptyNote } from "../ui";

export const metadata: Metadata = { title: "My cars", robots: { index: false, follow: false } };

const STEPS = ["not_booked", "booked", "shipped", "delivered"] as const;

/** The customer's cars: status, shipping progress and tracking, and their documents. */
export default async function AccountCars() {
  await requireActivePortal();
  const [cars, docs] = await Promise.all([getPortalVehicles(), getPortalDocuments()]);
  if (!cars.length) return <EmptyNote>No cars on your account yet. Cars appear here once they are reserved or invoiced to you.</EmptyNote>;

  return (
    <div className="grid gap-4">
      {cars.map((v) => {
        const step = v.shipping_status ? STEPS.indexOf(v.shipping_status) : 0;
        const ship = v.shipping_status ? SHIPPING_STATUS[v.shipping_status] : SHIPPING_STATUS.not_booked;
        const myDocs = docs.filter((d) => d.vehicle_id === v.id);
        return (
          <Card key={v.id}>
            <div className="flex flex-wrap gap-4">
              <div className="h-28 w-40 shrink-0 overflow-hidden rounded-xl bg-black/5">
                {v.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicImageUrl(v.cover)} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <Car className="m-auto h-full w-10 opacity-40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-lg font-black">{[v.year, v.make, v.model, v.grade].filter(Boolean).join(" ")}</div>
                    <div className="text-xs text-white/70">
                      {v.stock_no}
                      {v.chassis_no ? ` · Chassis ${v.chassis_no}` : ""}
                      {v.color ? ` · ${v.color}` : ""}
                    </div>
                  </div>
                  <Pill cls={ship.cls}>{ship.label}</Pill>
                </div>
                {/* progress: preparing → booked → on the way → arrived */}
                <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Shipping progress">
                  {STEPS.map((s, i) => (
                    <li key={s} className="min-w-0">
                      <div className={`h-1.5 rounded-full ${i <= step ? "bg-[var(--accent)]" : "bg-current opacity-15"}`} />
                      <div className={`mt-1 truncate text-[11px] ${i <= step ? "font-bold" : "opacity-60"}`}>{SHIPPING_STATUS[s].label}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {(v.vessel_name || v.etd || v.eta || v.bl_no || v.container_no) && (
              <div className="mt-4 border-t border-current/10 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <Ship className="h-3.5 w-3.5" /> Shipping
                </div>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Vessel">{[v.vessel_name, v.voyage_no].filter(Boolean).join(" ")}</Field>
                  <Field label="Shipping line">{v.ship_company}</Field>
                  <Field label="Departs (ETD)">{fmtDate(v.etd)}</Field>
                  <Field label="Arrives (ETA)">{fmtDate(v.eta)}</Field>
                  <Field label="From">{v.port_of_loading}</Field>
                  <Field label="To">{v.place_of_delivery}</Field>
                  <Field label="B/L no.">{v.bl_no}</Field>
                  <Field label={v.shipment_type === "container" ? "Container" : "Method"}>{v.shipment_type === "container" ? v.container_no : v.shipment_type}</Field>
                </dl>
                {v.track_url && /^https?:\/\//i.test(v.track_url) && (
                  <a href={v.track_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline">
                    Track the ship <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}

            {(v.courier_company || v.courier_tracking) && (
              <div className="mt-4 border-t border-current/10 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <Package className="h-3.5 w-3.5" /> Original documents by courier
                </div>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Courier">{v.courier_company}</Field>
                  <Field label="Tracking no.">{v.courier_tracking}</Field>
                  <Field label="Sent">{fmtDate(v.courier_date)}</Field>
                </dl>
              </div>
            )}

            <div className="mt-4 border-t border-current/10 pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/60">
                <FileText className="h-3.5 w-3.5" /> Documents
              </div>
              {myDocs.length === 0 ? (
                <p className="text-sm text-white/70">Documents such as the B/L and export certificate will appear here when they&apos;re ready.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {myDocs.map((d) => (
                    <li key={d.id}>
                      <a
                        href={`/account/documents/${d.id}`}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-current/15 hover:bg-black/5"
                      >
                        <Download className="h-4 w-4 shrink-0 text-brand-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{DOC_KIND_LABEL[d.kind] ?? d.kind}</span>
                          <span className="block truncate text-xs text-white/70">
                            {d.file_name} · {fmtDate(d.created_at)}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
