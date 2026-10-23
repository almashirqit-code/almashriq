import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, ShieldAlert, MessageCircle, Car, Mail, Ship } from "lucide-react";
import { getCompany, whatsapp } from "@/lib/public-site";
import { money } from "@/lib/format";
import {
  getPortalMe,
  getPortalStatement,
  getPortalInvoices,
  getPortalVehicles,
  getPortalReservations,
  getPortalTTs,
  closingBalances,
  DOC_TYPE_LABEL,
  INVOICE_STATUS,
  SHIPPING_STATUS,
  fmtDate,
} from "@/lib/portal";
import { Card, Pill, SectionTitle, EmptyNote } from "./ui";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function AccountHome() {
  const [me, company] = await Promise.all([getPortalMe(), getCompany()]);
  const wa = whatsapp(company, "Hello Al Mashriq, I'm writing from my customer account.");
  const contact = (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="glass flex items-center gap-3 rounded-2xl p-4 font-bold hover:brightness-105">
          <MessageCircle className="h-5 w-5 text-[#25D366]" /> Message us on WhatsApp
        </a>
      )}
      <Link href="/cars" className="glass flex items-center gap-3 rounded-2xl p-4 font-bold hover:brightness-105">
        <Car className="h-5 w-5 text-brand-600" /> Browse our stock
      </Link>
    </div>
  );

  if (me?.status !== "active") {
    return (
      <>
        {me?.status === "rejected" ? (
          <Card>
            <ShieldAlert className="mb-2 h-8 w-8 text-brand-600" />
            <h2 className="text-lg font-bold">We couldn&apos;t verify this account</h2>
            <p className="mt-1 text-sm text-white/70">Please contact us so we can help you get set up.</p>
          </Card>
        ) : (
          <Card>
            <Clock3 className="mb-2 h-8 w-8 text-amber-600" />
            <h2 className="text-lg font-bold">We&apos;re setting up your account</h2>
            <p className="mt-1 text-sm text-white/70">
              Our team will link your purchases to this login and assign your sales agent. Once that&apos;s done, your invoices, payments and shipments will appear here.
            </p>
          </Card>
        )}
        {contact}
      </>
    );
  }

  const [statement, invoices, vehicles, reservations, tts] = await Promise.all([
    getPortalStatement(),
    getPortalInvoices(),
    getPortalVehicles(),
    getPortalReservations(),
    getPortalTTs(),
  ]);
  const balances = [...closingBalances(statement).entries()].filter(([, v]) => Math.abs(v) >= 0.005);
  const moving = vehicles.filter((v) => v.shipping_status === "booked" || v.shipping_status === "shipped");
  const activeRes = reservations.filter((r) => r.status === "active").length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Balance due</div>
          {balances.length ? (
            balances.map(([cur, v]) => (
              <div key={cur} className={`text-2xl font-black tabular-nums ${v > 0 ? "text-brand-700" : "text-emerald-700"}`}>
                {money(v, cur)}
              </div>
            ))
          ) : (
            <div className="text-2xl font-black text-emerald-700">Nothing due</div>
          )}
          <Link href="/account/statement" className="mt-1 inline-block text-xs font-bold text-brand-700 hover:underline">
            View statement →
          </Link>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/60">My cars</div>
          <div className="text-2xl font-black">{vehicles.length}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Active reservations</div>
          <div className="text-2xl font-black">{activeRes}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-white/60">TT payments</div>
          <div className="text-2xl font-black">{tts.length}</div>
        </Card>
      </div>

      {moving.length > 0 && (
        <>
          <SectionTitle title="On the way" href="/account/cars" link="All my cars" />
          <div className="grid gap-3 md:grid-cols-2">
            {moving.map((v) => (
              <Card key={v.id} className="flex items-center gap-4">
                <Ship className="h-8 w-8 shrink-0 text-cerulean-600" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">
                    {[v.year, v.make, v.model].filter(Boolean).join(" ")} · {v.stock_no}
                  </div>
                  <div className="truncate text-sm text-white/70">
                    {v.vessel_name ? `${v.vessel_name}${v.voyage_no ? ` ${v.voyage_no}` : ""}` : "Vessel to be confirmed"}
                    {v.eta ? ` · ETA ${fmtDate(v.eta)}` : ""}
                  </div>
                </div>
                {v.shipping_status && <Pill cls={SHIPPING_STATUS[v.shipping_status].cls}>{SHIPPING_STATUS[v.shipping_status].label}</Pill>}
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionTitle title="Recent invoices" href="/account/invoices" link="All invoices" />
      {invoices.length === 0 ? (
        <EmptyNote>No invoices yet.</EmptyNote>
      ) : (
        <div className="grid gap-2">
          {invoices.slice(0, 5).map((i) => (
            <Link key={i.id} href={`/account/invoices/${i.id}`} className="glass flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-5 py-3 hover:brightness-105">
              <span className="font-bold">{i.invoice_no}</span>
              <span className="text-sm text-white/70">
                {DOC_TYPE_LABEL[i.doc_type]} · {fmtDate(i.issue_date)}
              </span>
              <span className="ml-auto font-bold tabular-nums">{money(i.total, i.currency)}</span>
              {i.doc_type !== "quotation" && <Pill cls={INVOICE_STATUS[i.status].cls}>{INVOICE_STATUS[i.status].label}</Pill>}
            </Link>
          ))}
        </div>
      )}

      {me.agent && (
        <>
          <SectionTitle title="Your sales agent" />
          <Card className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{me.agent.name}</div>
              <div className="text-sm text-white/70">Ask about prices, shipping or documents.</div>
            </div>
            <a href={`mailto:${me.agent.email}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-brand-700">
              <Mail className="h-4 w-4" /> Email
            </a>
          </Card>
        </>
      )}
      {contact}
    </>
  );
}
