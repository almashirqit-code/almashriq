import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { myMailboxes } from "@/lib/zoho-mail";
import { MailForm } from "../mail-form";

export const metadata = { title: "New email" };
export const dynamic = "force-dynamic";

/** New email from one of the mailboxes shared with this staff member. ?to= pre-fills the recipient. */
export default async function ComposePage({ searchParams }: { searchParams: Promise<{ mb?: string; to?: string }> }) {
  const sp = await searchParams;
  const boxes = await myMailboxes();
  const box = boxes.find((b) => b.id === sp.mb) ?? boxes[0];
  if (!box) notFound();
  const to = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sp.to ?? "") ? sp.to! : "";
  return (
    <>
      <PageHeader icon={<Mail />} tone="sky" title="New email" back={{ href: `/admin/inbox?mb=${box.id}`, label: box.email }} />
      <div className="max-w-3xl">
        <MailForm mailboxId={box.id} from={box.email} to={to} doneHref={`/admin/inbox?mb=${box.id}&folder=sent`} />
      </div>
    </>
  );
}
