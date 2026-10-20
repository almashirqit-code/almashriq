import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { AuctionHouse, Port, Yard } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { MastersManager } from "./masters-manager";

export const metadata = { title: "Ports & auctions" };

export default async function MastersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const profile = await getProfile();
  const { t } = await getT();
  const { tab } = await searchParams;
  const supabase = await createClient();

  const [ports, auctions, yards] = await Promise.all([
    supabase.from("ports").select("*").order("name"),
    supabase.from("auction_houses").select("*").order("name").limit(5000),
    supabase.from("yards").select("*").order("name").limit(5000),
  ]);

  return (
    <>
      <PageHeader title={t("m_title")} />
      <MastersManager
        initialTab={tab === "auctions" || tab === "yards" ? tab : "ports"}
        ports={(ports.data ?? []) as Port[]}
        auctions={(auctions.data ?? []) as AuctionHouse[]}
        yards={(yards.data ?? []) as Yard[]}
        canEdit={can.editStock(profile.role)}
      />
    </>
  );
}
