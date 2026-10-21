import { redirect } from "next/navigation";

/** Ports, auction houses & yards now live under Configuration. */
export default async function MastersRedirect({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(`/admin/settings?tab=ports${tab ? `&sub=${tab}` : ""}`);
}
