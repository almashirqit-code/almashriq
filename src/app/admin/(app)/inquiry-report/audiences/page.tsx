import Link from "next/link";
import { Users, Download, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { num } from "@/lib/format";
import { PageHeader, Empty, Stat } from "@/components/ui";
import { loadAudience } from "../data";

export const metadata = { title: "Leads / audiences" };

const when = (d: string) => (d ? new Date(d).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—");

/** Customers who opted in to marketing on the sign-up or inquiry form — the only people exported. */
export default async function AudiencesPage() {
  await requireRole(["admin", "manager"]);
  const rows = await loadAudience();
  const btn = "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50";

  return (
    <>
      <PageHeader
        icon={<Users />}
        tone="violet"
        title="Leads / audiences"
        subtitle="Customers who ticked “send me offers” when signing up or sending an inquiry. Download the CSV to upload as a Facebook or Google custom audience."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/inquiry-report" className={btn}>
              <ArrowLeft className="h-4 w-4" /> Inquiry report
            </Link>
            <a href="/admin/inquiry-report/audiences/export" className={btn}>
              <Download className="h-4 w-4" /> Audience CSV
            </a>
          </div>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="violet" label="Consented contacts" value={num(rows.length)} />
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <Empty>No one has opted in yet. The opt-in box is on the website’s sign-up and inquiry forms.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Country</th>
                  <th>From</th>
                  <th>Opted in</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.email || c.phone}>
                    <td className="font-medium text-slate-800">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="text-xs">{c.email || "—"}</td>
                    <td className="text-xs">{c.phone || "—"}</td>
                    <td className="text-xs">{c.country || "—"}</td>
                    <td className="text-xs">{c.source}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{when(c.consent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Only upload this list to ad platforms for the purpose customers agreed to (new stock and offers). Remove anyone who asks to unsubscribe.
      </p>
    </>
  );
}
