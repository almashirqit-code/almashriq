"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { notifyAccountApproved } from "@/lib/notify";

type Result = { error?: string; ok?: boolean };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/admin/portal-signups");
  revalidatePath("/admin/customers");
  revalidatePath("/admin", "layout"); // sidebar badge
}

/**
 * Approves a sign-up. `customer` is "" to create a new customer from the sign-up details,
 * a customer id, or a customer no. (digits) for an existing customer.
 */
export async function approveSignup(userId: string, customer: string, agentId: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();

  let customerId: string | null = null;
  const v = customer.trim();
  if (v) {
    // Looked up through RLS, so a manager only finds customers they can see.
    const q = /^\d+$/.test(v) ? supabase.from("customers").select("id").eq("customer_no", Number(v)) : UUID.test(v) ? supabase.from("customers").select("id").eq("id", v) : null;
    const { data } = q ? await q.maybeSingle() : { data: null };
    if (!data) return { error: "Customer not found. Use the customer no. shown in the Customers list." };
    customerId = data.id as string;
  }

  const { error } = await supabase.rpc("approve_portal_account", {
    p_user: userId,
    p_customer: customerId,
    p_agent: agentId || null,
  });
  if (error) return { error: error.message };
  notifyAccountApproved(userId);
  refresh();
  return { ok: true };
}

export async function rejectSignup(userId: string): Promise<Result> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_portal_account", { p_user: userId });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
