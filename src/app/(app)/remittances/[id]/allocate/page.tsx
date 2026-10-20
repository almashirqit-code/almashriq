import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import type { Currency, Remittance } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { AllocateForm, type StockOption } from "./allocate-form";

export default async function AllocatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin", "manager"]);
  const { id: idStr } = await params;
  const id = Number(idStr);
  const { t } = await getT();
  const supabase = await createClient();

  const { data: remRow } = await supabase.from("remittances").select("*").eq("id", id).maybeSingle();
  if (!remRow) notFound();
  const rem = remRow as Remittance;
  if (Number(rem.remaining_amount) <= 0) redirect(`/remittances/${id}`);

  const [vehicles, items, allocs] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, stock_no, chassis_no, make, model, year, status, price, price_currency")
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase
      .from("invoice_items")
      .select("vehicle_id, amount, invoices!inner(id, invoice_no, customer_id, currency, exchange_rate, status)")
      .not("vehicle_id", "is", null)
      .neq("invoices.status", "cancelled")
      .limit(10000),
    supabase.from("remittance_allocations").select("vehicle_id, amount, remittances(currency, exchange_rate)").limit(20000),
  ]);

  // Sold price (from the vehicle's live invoice) and what has already been allocated to it, in JPY.
  const sold = new Map<string, { amount: number; currency: Currency; rate: number; invoice_no: string; customer_id: string }>();
  for (const it of items.data ?? []) {
    const inv = it.invoices as unknown as { invoice_no: string; customer_id: string; currency: Currency; exchange_rate: number };
    if (it.vehicle_id && inv) {
      sold.set(it.vehicle_id, {
        amount: Number(it.amount),
        currency: inv.currency,
        rate: inv.currency === "JPY" ? 1 : Number(inv.exchange_rate) || 1,
        invoice_no: inv.invoice_no,
        customer_id: inv.customer_id,
      });
    }
  }
  const allocatedJpy = new Map<string, number>();
  for (const a of allocs.data ?? []) {
    const r = a.remittances as unknown as { currency: Currency; exchange_rate: number } | null;
    const rate = !r || r.currency === "JPY" ? 1 : Number(r.exchange_rate) || 1;
    allocatedJpy.set(a.vehicle_id, (allocatedJpy.get(a.vehicle_id) ?? 0) + Number(a.amount) * rate);
  }

  const options: StockOption[] = (vehicles.data ?? []).map((v) => {
    const s = sold.get(v.id);
    return {
      id: v.id,
      stock_no: v.stock_no,
      chassis_no: v.chassis_no,
      title: [v.year, v.make, v.model].filter(Boolean).join(" "),
      status: v.status,
      sold: s ? { amount: s.amount, currency: s.currency, rate: s.rate, invoice_no: s.invoice_no } : null,
      sameCustomer: s ? s.customer_id === rem.customer_id : false,
      allocatedJpy: allocatedJpy.get(v.id) ?? 0,
    };
  });
  // The remittance customer's invoiced vehicles first.
  options.sort((a, b) => Number(b.sameCustomer) - Number(a.sameCustomer));

  return (
    <>
      <PageHeader title={`${t("rem_allocate")} — #${id}`} back={{ href: `/remittances/${id}`, label: `#${id}` }} />
      <AllocateForm
        remittance={{
          id,
          currency: rem.currency,
          rate: rem.currency === "JPY" ? 1 : Number(rem.exchange_rate),
          available: Number(rem.remaining_amount),
        }}
        options={options}
      />
    </>
  );
}
