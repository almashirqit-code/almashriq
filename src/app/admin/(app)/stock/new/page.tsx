import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { VehicleForm } from "../vehicle-form";
import { createVehicle } from "../actions";
import { loadMasters } from "../masters-data";
import type { Currency } from "@/lib/types";

export default async function NewVehiclePage({ searchParams }: { searchParams: Promise<{ own?: string }> }) {
  const third = (await searchParams).own === "third_party";
  await requireRole(["admin", "manager"]);
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: settings }, { data: stockNo }] = await Promise.all([
    supabase.from("settings").select("exchange_rates").single(),
    // Suggested next stock no. (AM-…); staff can still type their own.
    supabase.rpc("next_ref", { p_kind: "vehicle" }),
  ]);
  const rates = (settings?.exchange_rates ?? {}) as Partial<Record<Currency, number>>;
  const defaultFx = Number(rates.USD ?? 0);
  return (
    <>
      <PageHeader title={t("stock_new")} back={third ? { href: "/admin/third-party", label: t("nav_third_party") } : { href: "/admin/stock", label: t("stock_title") }} />
      <VehicleForm
        vehicle={{ ...(third ? { ownership: "third_party" as const } : {}), ...(stockNo ? { stock_no: stockNo as string } : {}) }}
        action={createVehicle} showCost defaultFx={defaultFx} rates={rates} masters={await loadMasters()} />
    </>
  );
}
