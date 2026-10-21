import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { PageHeader, Stat } from "@/components/ui";
import { ReviewsManager, type ReviewRow } from "./reviews-manager";

export const metadata = { title: "Reviews" };

export default async function ReviewsAdmin() {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("*").order("review_date", { ascending: false }).order("created_at", { ascending: false });
  const rows = (data ?? []).map((r) => ({ ...r, country: r.country ?? "", title: r.title ?? "", vehicle: r.vehicle ?? "" })) as ReviewRow[];
  const pub = rows.filter((r) => r.status === "published");
  const avg = pub.length ? pub.reduce((s, r) => s + r.rating, 0) / pub.length : 0;
  return (
    <>
      <PageHeader icon={<Star />} tone="amber" title="Reviews" subtitle="Only published reviews appear on the website. Publish genuine customer reviews only." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat tone="emerald" label="Published" value={pub.length} />
        <Stat tone="amber" label="Average rating" value={pub.length ? `${avg.toFixed(1)} / 5` : "—"} />
        <Stat tone="slate" label="Pending" value={rows.filter((r) => r.status === "pending").length} />
      </div>
      <ReviewsManager reviews={rows} />
    </>
  );
}
