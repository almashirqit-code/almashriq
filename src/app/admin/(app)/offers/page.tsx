import { Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader, Stat } from "@/components/ui";
import { OffersManager, type OfferRow } from "./offers-manager";

export const metadata = { title: "Offers" };

export default async function OffersAdmin() {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []).map((o) => ({
    ...o,
    summary: o.summary ?? "",
    ends_on: o.ends_on ?? "",
    stock_nos: (o.stock_nos ?? []).join(", "),
  })) as OfferRow[];
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const live = rows.filter((o) => o.active && o.starts_on <= today && (!o.ends_on || o.ends_on >= today));
  return (
    <>
      <PageHeader icon={<Tag />} tone="brand" title="Offers" subtitle="Live offers show on the website's Offers page and home page. Expired offers hide by themselves." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="emerald" label="Live now" value={live.length} />
        <Stat tone="slate" label="All offers" value={rows.length} />
      </div>
      <OffersManager offers={rows} today={today} />
    </>
  );
}
