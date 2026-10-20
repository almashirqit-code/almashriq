import { requireRole } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { VehicleForm } from "../vehicle-form";
import { createVehicle } from "../actions";

export default async function NewVehiclePage() {
  await requireRole(["admin", "manager"]);
  const { t } = await getT();
  return (
    <>
      <PageHeader title={t("stock_new")} back={{ href: "/stock", label: t("stock_title") }} />
      <VehicleForm action={createVehicle} showCost />
    </>
  );
}
