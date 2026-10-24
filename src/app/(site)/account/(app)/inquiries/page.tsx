import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalMe, getPortalInquiries, INQUIRY_STATUS, fmtDate } from "@/lib/portal";
import { Card, Pill, SectionTitle, EmptyNote } from "../ui";
import { PortalInquiryForm } from "./inquiry-form";

export const metadata: Metadata = { title: "My inquiries", robots: { index: false, follow: false } };

/** Inquiries from the account go straight to the customer's agent (pending accounts: to the team). */
export default async function AccountInquiries({ searchParams }: { searchParams: Promise<{ stock?: string }> }) {
  const me = await getPortalMe();
  if (!me || me.status === "rejected") redirect("/account");
  const { stock } = await searchParams;
  const list = await getPortalInquiries();
  const agent = me.agent?.name ?? null;

  return (
    <>
      <Card>
        <h2 className="text-lg font-black">{agent ? `Ask ${agent}` : "Send us an inquiry"}</h2>
        <p className="mb-4 text-sm text-white/70">
          {agent ? "Your message goes straight to your sales agent." : "Your message goes to our sales team; once your account is set up, your own agent will follow up."}
        </p>
        <PortalInquiryForm stock={stock?.slice(0, 40)} agent={agent} />
      </Card>

      <SectionTitle title="My inquiries" />
      {list.length === 0 ? (
        <EmptyNote>You haven&apos;t sent any inquiries yet.</EmptyNote>
      ) : (
        <div className="grid gap-2">
          {list.map((i) => {
            const st = INQUIRY_STATUS[i.status] ?? { label: i.status, cls: "bg-slate-200 text-slate-800" };
            return (
              <Card key={i.inquiry_no} className="py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold">INQ-{i.inquiry_no}</span>
                  <span className="text-xs text-white/70">
                    {fmtDate(i.created_at)}
                    {i.stock_no ? ` · ${i.stock_no}` : ""}
                    {i.agent ? ` · ${i.agent}` : ""}
                  </span>
                  <span className="ml-auto">
                    <Pill cls={st.cls}>{st.label}</Pill>
                  </span>
                </div>
                {i.message && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-white/80">{i.message}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
