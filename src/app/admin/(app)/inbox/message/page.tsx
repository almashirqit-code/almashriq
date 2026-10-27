import { redirect } from "next/navigation";

/** Old link format: emails now open in the Inbox's reading pane. */
export default async function MessagePage({ searchParams }: { searchParams: Promise<{ mb?: string; f?: string; m?: string }> }) {
  const { mb = "", f = "", m = "" } = await searchParams;
  redirect(`/admin/inbox?${new URLSearchParams({ mb, f, m })}`);
}
