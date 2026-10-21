import Link from "next/link";
import { Tractor, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { rowsParam } from "@/lib/rows";
import { DEFAULT_BRANCHES, parseBranch } from "@/lib/branches";
import { MACHINE_CATEGORIES, MACHINE_STATUSES } from "@/lib/machinery";
import { DEFAULT_RATES, type Currency } from "@/lib/types";
import { RowsSelect } from "@/components/rows-select";
import { PageHeader, Pagination, Stat } from "@/components/ui";
import { MachineryManager, type MachineRow } from "./machinery-manager";

export const metadata = { title: "Machinery" };

type SP = { q?: string; category?: string; status?: string; branch?: string; page?: string; rows?: string };

export default async function MachineryAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const canEdit = profile.role === "admin" || profile.role === "manager";
  const seeCost = can.seeCost(profile.role);
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  const size = rowsParam(sp.rows);
  const q = (sp.q ?? "").trim();

  let query = supabase
    .from("machinery")
    .select("*, machinery_images(id, path, sort_order)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (q) {
    const s = q.replace(/[%,()]/g, " ");
    query = query.or(`stock_no.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%,category.ilike.%${s}%,serial_no.ilike.%${s}%`);
  }
  if (sp.category) query = query.ilike("category", sp.category);
  if (sp.status && (MACHINE_STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status);
  const branch = parseBranch(sp.branch);
  if (branch) query = query.eq("branch", branch);

  const [{ data, count }, { data: all }, { data: settings }] = await Promise.all([
    query,
    supabase.from("machinery").select("status, category, show_on_website").limit(20000),
    supabase.from("settings").select("exchange_rates").single(),
  ]);
  const rates = { ...DEFAULT_RATES, ...(settings?.exchange_rates ?? {}) } as Record<Currency, number>;
  const rows = (data ?? []) as MachineRow[];
  const stats = all ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  const categories = [...new Set([...MACHINE_CATEGORIES, ...stats.map((s) => s.category).filter(Boolean)])] as string[];
  const keep = Object.fromEntries(Object.entries({ q, category: sp.category, status: sp.status, branch: sp.branch, rows: sp.rows }).filter(([, v]) => v)) as Record<string, string>;

  return (
    <>
      <PageHeader
        icon={<Tractor />}
        tone="amber"
        title="Heavy machinery"
        subtitle="Excavators, loaders, cranes, forklifts… Machines marked “On website” and not sold appear on the public Machinery page."
        actions={
          canEdit && (
            <Link href="/admin/machinery/import" className="btn-secondary">
              <Upload className="h-4 w-4" />
              Bulk import
            </Link>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat tone="amber" label="Machines" value={stats.length} />
        <Stat tone="emerald" label="In stock" value={stats.filter((s) => s.status === "in_stock").length} />
        <Stat tone="sky" label="Reserved" value={stats.filter((s) => s.status === "reserved").length} />
        <Stat tone="violet" label="On website" value={stats.filter((s) => s.show_on_website && s.status !== "shipped").length} />
      </div>

      <div className="card overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3" action="/admin/machinery">
          <RowsSelect value={size} />
          <input name="q" defaultValue={q} placeholder="Stock no., make, model, serial no.…" className="input max-w-xs" />
          <select name="category" defaultValue={sp.category ?? ""} className="input w-auto">
            <option value="">All types</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
            <option value="">Any status</option>
            {MACHINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <select name="branch" defaultValue={sp.branch ?? ""} className="input w-auto">
            <option value="">Any branch</option>
            {DEFAULT_BRANCHES.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="btn-secondary">Search</button>
          {(q || sp.category || sp.status || sp.branch) && (
            <Link href="/admin/machinery" className="text-xs font-semibold text-brand-600 hover:underline">
              Clear
            </Link>
          )}
        </form>
        <MachineryManager machines={rows} canEdit={canEdit} seeCost={seeCost} categories={categories} rates={rates} />
        <Pagination
          page={page}
          pages={pages}
          makeHref={(p) => `/admin/machinery?${new URLSearchParams({ ...keep, page: String(p) })}`}
          labels={{ previous: "Previous", next: "Next", pageOf: `Page ${page} of ${pages}` }}
        />
      </div>
    </>
  );
}
