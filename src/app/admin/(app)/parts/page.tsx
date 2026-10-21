import Link from "next/link";
import { Upload, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { rowsParam } from "@/lib/rows";
import { PART_CATEGORIES, PART_STATUSES } from "@/lib/parts";
import { RowsSelect } from "@/components/rows-select";
import { PageHeader, Pagination, Stat } from "@/components/ui";
import { PartsManager, type PartRow } from "./parts-manager";

export const metadata = { title: "Parts" };

export default async function PartsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string; rows?: string }> }) {
  const sp = await searchParams;
  const profile = await getProfile();
  const canEdit = profile.role === "admin" || profile.role === "manager";
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page) || 1);
  const size = rowsParam(sp.rows);
  const q = (sp.q ?? "").trim();

  let query = supabase
    .from("parts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (q) {
    const s = q.replace(/[%,()]/g, " ");
    query = query.or(`part_no.ilike.%${s}%,name.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%,model_code.ilike.%${s}%,oem_no.ilike.%${s}%`);
  }
  if (sp.category) query = query.ilike("category", sp.category);
  if (sp.status && (PART_STATUSES as string[]).includes(sp.status)) query = query.eq("status", sp.status);

  const [{ data, count }, { data: all }] = await Promise.all([query, supabase.from("parts").select("status, quantity, show_on_website, category").limit(20000)]);
  const rows = (data ?? []) as PartRow[];
  const stats = all ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  const categories = [...new Set([...PART_CATEGORIES, ...stats.map((s) => s.category).filter(Boolean)])] as string[];
  const keep = Object.fromEntries(Object.entries({ q, category: sp.category, status: sp.status, rows: sp.rows }).filter(([, v]) => v)) as Record<string, string>;

  return (
    <>
      <PageHeader
        icon={<Wrench />}
        tone="cyan"
        title="Parts"
        subtitle="Spare parts stock. Parts marked “On website” and not sold appear on the public Parts page."
        actions={
          canEdit && (
            <Link href="/admin/parts/import" className="btn-secondary">
              <Upload className="h-4 w-4" />
              Bulk import
            </Link>
          )
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat tone="cyan" label="Part lines" value={stats.length} />
        <Stat tone="emerald" label="Available" value={stats.filter((s) => s.status === "available").length} hint={`${stats.filter((s) => s.status === "available").reduce((n, s) => n + (s.quantity ?? 0), 0)} pcs`} />
        <Stat tone="amber" label="Reserved" value={stats.filter((s) => s.status === "reserved").length} />
        <Stat tone="violet" label="On website" value={stats.filter((s) => s.show_on_website && s.status !== "sold").length} />
      </div>

      <div className="card overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3" action="/admin/parts">
          <RowsSelect value={size} />
          <input name="q" defaultValue={q} placeholder="Part no., name, make, model, OEM no.…" className="input max-w-xs" />
          <select name="category" defaultValue={sp.category ?? ""} className="input w-auto">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
            <option value="">Any status</option>
            {PART_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="btn-secondary">Search</button>
          {(q || sp.category || sp.status) && (
            <Link href="/admin/parts" className="text-xs font-semibold text-brand-600 hover:underline">
              Clear
            </Link>
          )}
        </form>
        <PartsManager parts={rows} canEdit={canEdit} categories={categories} />
        <Pagination
          page={page}
          pages={pages}
          makeHref={(p) => `/admin/parts?${new URLSearchParams({ ...keep, page: String(p) })}`}
          labels={{ previous: "Previous", next: "Next", pageOf: `Page ${page} of ${pages}` }}
        />
      </div>
    </>
  );
}
