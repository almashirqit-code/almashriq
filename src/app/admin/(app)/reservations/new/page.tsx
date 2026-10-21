import { notFound, redirect } from "next/navigation";
import { BookmarkCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, can } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { ReservationForm } from "../reservation-form";
import { loadFormLists, loadRates, loadReserveVehicle } from "../data";

export const metadata = { title: "Reserve vehicle" };

export default async function NewReservationPage({ searchParams }: { searchParams: Promise<{ vehicle?: string }> }) {
  const { vehicle: vehicleId } = await searchParams;
  if (!vehicleId) redirect("/admin/stock");
  const profile = await getProfile();
  const { t } = await getT();

  // Already reserved? Go to that reservation.
  const supabase = await createClient();
  const { data: active } = await supabase.from("reservations").select("id").eq("vehicle_id", vehicleId).eq("status", "active").maybeSingle();
  if (active) redirect(`/admin/reservations/${active.id}`);

  const { rates, defaultCurrency } = await loadRates();
  const [vehicle, lists] = await Promise.all([loadReserveVehicle(vehicleId, rates), loadFormLists()]);
  if (!vehicle) notFound();

  return (
    <>
      <PageHeader icon={<BookmarkCheck />} tone="amber" title={t("rv_new")} subtitle={vehicle.stock_no} back={{ href: `/admin/stock/${vehicle.id}`, label: vehicle.stock_no }} />
      {vehicle.status !== "in_stock" && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("rv_not_available")}</p>}
      <ReservationForm
        vehicle={vehicle}
        {...lists}
        rates={rates}
        defaultCurrency={defaultCurrency}
        meId={profile.id}
        seeCost={can.seeCost(profile.role)}
      />
    </>
  );
}
