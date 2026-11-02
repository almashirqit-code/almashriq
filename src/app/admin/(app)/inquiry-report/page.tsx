import Link from "next/link";
import { BarChart3, Download, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { num } from "@/lib/format";
import { PageHeader, Empty, Stat } from "@/components/ui";
import { loadReport, readDays, PERIODS, type Bucket } from "./data";

export const metadata = { title: "Inquiry report" };

function Breakdown({ title, rows, limit = 25 }: { title: string; rows: Bucket[]; limit?: number }) {
  return (
    <div className="card overflow-hidden">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">{title}</h2>
      {rows.length === 0 ? (
        <Empty>No clicks or inquiries in this period.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{title.replace(/^By /, "")}</th>
                <th className="text-right">WhatsApp clicks</th>
                <th className="text-right">Web inquiries</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((r) => (
                <tr key={r.key}>
                  <td className="font-medium text-slate-800">{r.key}</td>
                  <td className="text-right tabular-nums">{num(r.clicks)}</td>
                  <td className="text-right tabular-nums">{num(r.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Where inquiries come from: WhatsApp button clicks (logged by /wa) next to web inquiry-form leads. */
export default async function InquiryReportPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireRole(["admin", "manager"]);
  const days = readDays((await searchParams).days);
  const r = await loadReport(days);
  const btn = "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50";

  return (
    <>
      <PageHeader
        icon={<BarChart3 />}
        tone="emerald"
        title="Inquiry report"
        subtitle="WhatsApp clicks from the website and web inquiry forms, by day, car, country and campaign (UTM tags)."
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={`/admin/inquiry-report/export?days=${days}`} className={btn}>
              <Download className="h-4 w-4" /> Clicks CSV
            </a>
            <Link href="/admin/inquiry-report/audiences" className={btn}>
              <Users className="h-4 w-4" /> Leads / audiences
            </Link>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((d) => (
          <Link
            key={d}
            href={`/admin/inquiry-report?days=${d}`}
            aria-current={d === days ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${d === days ? "bg-slate-900 text-white ring-slate-900" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
          >
            Last {d} days
          </Link>
        ))}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="emerald" label="WhatsApp clicks" value={num(r.totals.clicks)} />
        <Stat tone="violet" label="Web inquiries" value={num(r.totals.leads)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="By day" rows={r.byDay} limit={days} />
        <Breakdown title="By car" rows={r.byCar} />
        <Breakdown title="By country" rows={r.byCountry} />
        <Breakdown title="By campaign" rows={r.byCampaign} />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        A click means a visitor opened WhatsApp from the website; whether they sent a message is only visible in WhatsApp. Campaigns come from utm_source / utm_campaign on the page the visitor was on.
      </p>
    </>
  );
}
