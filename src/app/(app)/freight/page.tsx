import { Ship } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { FreightRate, Port } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { FreightManager } from "./freight-manager";

export const metadata = { title: "Freight rates" };

export default async function FreightPage() {
  const profile = await getProfile();
  const { t } = await getT();
  const supabase = await createClient();
  const [rates, ports] = await Promise.all([
    supabase.from("freight_rates").select("*").order("destination").order("shipment_type").limit(5000),
    supabase.from("ports").select("*").order("name"),
  ]);
  return (
    <>
      <PageHeader icon={<Ship />} tone="sky" title={t("fr_title")} subtitle={t("fr_intro")} />
      <FreightManager
        rates={(rates.data ?? []) as FreightRate[]}
        ports={(ports.data ?? []) as Port[]}
        canEdit={can.editStock(profile.role)}
      />
    </>
  );
}
