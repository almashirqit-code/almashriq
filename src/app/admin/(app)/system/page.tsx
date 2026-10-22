import { Activity, CheckCircle2, XCircle, Globe, Database, KeyRound, ImageIcon, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkDatabase, checkPage, timed, type Check } from "@/lib/health";
import { SITE_URL } from "@/lib/public-site";
import { PageHeader } from "@/components/ui";
import { RefreshControls } from "./refresh";

export const metadata = { title: "System monitor" };
export const dynamic = "force-dynamic";

/**
 * Admin → System monitor: is the database answering, can staff sign in, are photos served,
 * and is the public website up? Every check runs live when the page opens (and every minute).
 */
export default async function SystemPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const [db, records, auth, storage, home, cars, sitemap, health] = await Promise.all([
    checkDatabase(),
    timed("ERP data", async () => {
      const count = async (t: string) => {
        const { count, error } = await supabase.from(t).select("id", { count: "exact", head: true });
        if (error) throw new Error(`${t}: ${error.message}`);
        return count ?? 0;
      };
      const [v, c, i] = await Promise.all([count("vehicles"), count("customers"), count("invoices")]);
      return `${v.toLocaleString()} vehicles · ${c.toLocaleString()} customers · ${i.toLocaleString()} invoices`;
    }),
    timed("Sign-in service", async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error(error?.message ?? "no session");
      return "Staff sign-in working";
    }),
    timed("Photo storage", async () => {
      const { data, error } = await supabase.storage.from("vehicle-images").list("vehicles", { limit: 1 });
      if (error) throw new Error(error.message);
      return data ? "Photos bucket answering" : "No answer";
    }),
    checkPage("Home page", "/", /<h1/),
    checkPage("Car stock list", "/cars", /cars found/),
    checkPage("Sitemap (Google)", "/sitemap.xml", /<urlset/),
    checkPage("Health endpoint", "/api/health", /"ok":true/),
  ]);

  const groups: { title: string; icon: React.ReactNode; checks: Check[] }[] = [
    { title: "Database", icon: <Database className="h-4 w-4" />, checks: [db, records] },
    { title: "Services", icon: <KeyRound className="h-4 w-4" />, checks: [auth, storage] },
    { title: "Website", icon: <Globe className="h-4 w-4" />, checks: [home, cars, sitemap, health] },
  ];
  const all = groups.flatMap((g) => g.checks);
  const down = all.filter((c) => !c.ok);
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

  return (
    <>
      <PageHeader
        icon={<Activity />}
        tone="emerald"
        title="System monitor"
        subtitle={`Live checks · ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "medium" })} (Japan)`}
        actions={<RefreshControls />}
      />

      <div className={`card mb-5 flex items-center gap-3 px-5 py-4 ${down.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
        {down.length ? <XCircle className="h-7 w-7 shrink-0 text-red-600" /> : <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" />}
        <div>
          <div className={`text-lg font-bold ${down.length ? "text-red-800" : "text-emerald-800"}`}>
            {down.length ? `${down.length} of ${all.length} checks failing` : "All systems working"}
          </div>
          <div className="text-sm text-slate-600">
            {down.length ? `Problem: ${down.map((c) => c.name).join(", ")}.` : `Database, sign-in, photos and the website (${new URL(SITE_URL).host}) all answered.`}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.title} className="card overflow-hidden">
            <div className="card-head">
              <h2 className="card-title">
                {g.icon}
                {g.title}
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {g.checks.map((c) => (
                <li key={c.name} className="flex items-start gap-3 px-5 py-3.5">
                  {c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{c.ok ? "OK" : "DOWN"}</span>
                    </div>
                    <div className={`text-sm ${c.ok ? "text-slate-500" : "text-red-700"}`}>{c.detail}</div>
                    {c.ms != null && (
                      <div className={`text-xs ${c.ms > 3000 ? "font-semibold text-amber-700" : "text-slate-400"}`}>
                        {c.ms.toLocaleString()} ms{c.ms > 3000 ? " · slow" : ""}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card px-5 py-4 text-sm">
          <h2 className="card-title mb-2">
            <ImageIcon className="h-4 w-4" />
            Deployment
          </h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1">
            <dt className="text-slate-500">Website</dt>
            <dd>
              <a href={SITE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-cerulean-700 hover:underline">
                {new URL(SITE_URL).host} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </dd>
            <dt className="text-slate-500">Environment</dt>
            <dd className="font-semibold">{process.env.VERCEL_ENV ?? "local"}</dd>
            {commit && (
              <>
                <dt className="text-slate-500">Version</dt>
                <dd className="font-mono">{commit}</dd>
              </>
            )}
            {process.env.VERCEL_REGION && (
              <>
                <dt className="text-slate-500">Server region</dt>
                <dd>{process.env.VERCEL_REGION}</dd>
              </>
            )}
          </dl>
        </section>
        <section className="card px-5 py-4 text-sm text-slate-600">
          <h2 className="card-title mb-2">
            <Activity className="h-4 w-4" />
            Alerts when the site is down
          </h2>
          <p>
            This page can only run while the website is up. To be alerted when it goes down, add a free uptime monitor (e.g. UptimeRobot or Better Stack) that checks{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">{SITE_URL}/api/health</code> every 5 minutes. It answers <b>200</b> when the website and database
            are up and <b>503</b> when the database is down.
          </p>
        </section>
      </div>
    </>
  );
}
