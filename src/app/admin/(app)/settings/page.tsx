import Link from "next/link";
import { Settings as SettingsIcon, Anchor, Ship, Tag, SlidersHorizontal, Globe, ListTree } from "lucide-react";
import type { CatalogMake } from "@/lib/catalog";
import { CatalogManager } from "./catalog-manager";
import { createClient } from "@/lib/supabase/server";
import { requireRole, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { mergeBranches } from "@/lib/branches";
import type { AuctionHouse, Branch, Currency, FreightRate, Port, Settings, Yard } from "@/lib/types";
import { BranchesManager } from "./branches-manager";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";
import { MastersManager } from "../masters/masters-manager";
import { FreightManager } from "../freight/freight-manager";
import { MakeLogos, type MakeRow } from "./make-logos";

type Tab = "general" | "branches" | "catalog" | "ports" | "freight" | "makes";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; sub?: string }> }) {
  const profile = await requireRole(["admin", "manager"]);
  const { t } = await getT();
  const sp = await searchParams;
  const isAdmin = profile.role === "admin";
  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    ...(isAdmin ? [{ key: "general" as Tab, label: "General", icon: SlidersHorizontal }] : []),
    { key: "branches", label: t("settings_branches"), icon: Globe },
    { key: "catalog", label: "Makes & models", icon: ListTree },
    { key: "ports", label: t("m_title"), icon: Anchor },
    { key: "freight", label: t("fr_title"), icon: Ship },
    { key: "makes", label: "Make logos", icon: Tag },
  ];
  const tab: Tab = tabs.some((x) => x.key === sp.tab) ? (sp.tab as Tab) : tabs[0].key;
  const supabase = await createClient();

  let body: React.ReactNode = null;
  if (tab === "general") {
    const { data } = await supabase.from("settings").select("*").single();
    body = (
      <div className="max-w-4xl">
        <SettingsForm settings={data as Settings} />
      </div>
    );
  } else if (tab === "branches") {
    const [{ data: branches }, { data: s }] = await Promise.all([supabase.from("branches").select("*"), supabase.from("settings").select("exchange_rates").single()]);
    body = <BranchesManager branches={mergeBranches(branches as Branch[] | null)} rates={(s?.exchange_rates ?? {}) as Partial<Record<Currency, number>>} canEdit={isAdmin} />;
  } else if (tab === "catalog") {
    const [{ data: cm }, vs, ms] = await Promise.all([
      supabase.from("catalog_makes").select("id, kind, name, active, catalog_models(id, name, model_code, active)").order("name").limit(3000),
      supabase.from("vehicles").select("make").limit(30000),
      supabase.from("machinery").select("make").limit(30000),
    ]);
    const count = (rows: { make: string | null }[] | null) => {
      const out: Record<string, number> = {};
      for (const r of rows ?? []) {
        const k = (r.make ?? "").trim().toLowerCase();
        if (k) out[k] = (out[k] ?? 0) + 1;
      }
      return out;
    };
    const makes = ((cm ?? []) as unknown as (Omit<CatalogMake, "models"> & { catalog_models: CatalogMake["models"] | null })[]).map(({ catalog_models, ...m }) => ({ ...m, models: catalog_models ?? [] }));
    body = <CatalogManager makes={makes} usage={{ vehicle: count(vs.data), machinery: count(ms.data) }} canEdit={can.editStock(profile.role)} />;
  } else if (tab === "ports") {
    const [ports, auctions, yards] = await Promise.all([
      supabase.from("ports").select("*").order("name"),
      supabase.from("auction_houses").select("*").order("name").limit(5000),
      supabase.from("yards").select("*").order("name").limit(5000),
    ]);
    body = (
      <MastersManager
        initialTab={sp.sub === "auctions" || sp.sub === "yards" ? sp.sub : "ports"}
        ports={(ports.data ?? []) as Port[]}
        auctions={(auctions.data ?? []) as AuctionHouse[]}
        yards={(yards.data ?? []) as Yard[]}
        canEdit={can.editStock(profile.role)}
      />
    );
  } else if (tab === "freight") {
    const [rates, ports] = await Promise.all([
      supabase.from("freight_rates").select("*").order("destination").order("shipment_type").limit(5000),
      supabase.from("ports").select("*").order("name"),
    ]);
    body = <FreightManager rates={(rates.data ?? []) as FreightRate[]} ports={(ports.data ?? []) as Port[]} canEdit={can.editStock(profile.role)} />;
  } else {
    const { data } = await supabase.rpc("public_makes");
    body = <MakeLogos makes={(data ?? []) as MakeRow[]} canEdit={can.editStock(profile.role)} />;
  }

  return (
    <>
      <PageHeader icon={<SettingsIcon />} tone="slate" title={t("settings_title")} />
      <div className="mb-5 flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200 sm:inline-flex">
        {tabs.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/admin/settings?tab=${key}`}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === key ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
      {body}
    </>
  );
}
