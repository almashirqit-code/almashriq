import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { t } = await getT();
  const { return_to } = await searchParams;
  return (
    <>
      <PageHeader title={t("cust_new")} back={{ href: "/customers", label: t("cust_title") }} />
      <div className="max-w-3xl">
        <CustomerForm action={createCustomer} returnTo={return_to} />
      </div>
    </>
  );
}
