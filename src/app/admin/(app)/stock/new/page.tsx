import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { VehicleForm } from "../vehicle-form";
import { createVehicle } from "../actions";
import { loadMasters } from "../masters-data";

export default async function NewVehiclePage() {
  await requireRole(["admin", "manager"]);
  const { t } = await getT();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("settings").select("exchange_rates").single();
  const defaultFx = Number((settings?.exchange_rates as Record<string, number> | null)?.USD ?? 0);
  return (
    <>
      <PageHeader title={t("stock_new")} back={{ href: "/admin/stock", label: t("stock_title") }} />
      <VehicleForm action={createVehicle} showCost defaultFx={defaultFx} masters={await loadMasters()} />
    </>
  );
}
