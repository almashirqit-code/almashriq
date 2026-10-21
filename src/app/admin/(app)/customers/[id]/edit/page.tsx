import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import type { Customer } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "../../customer-form";
import { updateCustomer } from "../../actions";
import { loadStaff } from "../../staff";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as Customer;
  const staff = await loadStaff();

  return (
    <>
      <PageHeader
        title={`${t("cust_edit")} — ${c.customer_no ? c.customer_no + " · " : ""}${c.name}`}
        back={{ href: `/admin/customers/${id}`, label: c.name }}
      />
      <div className="max-w-3xl">
        <CustomerForm customer={c} action={updateCustomer.bind(null, id)} staff={staff} />
      </div>
    </>
  );
}
