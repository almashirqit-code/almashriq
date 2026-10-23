import type { Metadata } from "next";
import { Car } from "lucide-react";
import { money, publicImageUrl } from "@/lib/format";
import { requireActivePortal, getPortalReservations, fmtDate } from "@/lib/portal";
import { Card, Pill, Field, EmptyNote } from "../ui";

export const metadata: Metadata = { title: "My reservations", robots: { index: false, follow: false } };

const RES_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Reserved for you", cls: "bg-amber-100 text-amber-900" },
  invoiced: { label: "Invoiced", cls: "bg-emerald-100 text-emerald-900" },
  cancelled: { label: "Cancelled", cls: "bg-slate-200 text-slate-700" },
};

export default async function AccountReservations() {
  await requireActivePortal();
  const list = await getPortalReservations();
  if (!list.length) return <EmptyNote>No reservations yet. Ask your agent to reserve a car for you.</EmptyNote>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {list.map((r) => {
        const st = RES_STATUS[r.status] ?? { label: r.status, cls: "bg-slate-200 text-slate-800" };
        return (
          <Card key={r.id} className="flex gap-4">
            <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-black/5">
              {r.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicImageUrl(r.cover)} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <Car className="m-auto h-full w-8 opacity-40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-bold">{[r.year, r.make, r.model].filter(Boolean).join(" ") || "Vehicle"}</div>
                  <div className="text-xs text-white/70">
                    Reservation #{r.reservation_no}
                    {r.stock_no ? ` · ${r.stock_no}` : ""}
                  </div>
                </div>
                <Pill cls={st.cls}>{st.label}</Pill>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Price">{r.sold_price != null ? `${money(r.sold_price, r.currency)} ${r.price_term ?? ""}` : "—"}</Field>
                <Field label={r.status === "active" ? "Reserved until" : "Reserved on"}>{fmtDate(r.status === "active" ? r.reserved_until : r.created_at)}</Field>
                <Field label="Shipping">{[r.shipment_type, r.port_of_discharge].filter(Boolean).join(" · ")}</Field>
                {Number(r.freight) > 0 && <Field label="Freight">{money(r.freight, r.currency)}</Field>}
              </dl>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
