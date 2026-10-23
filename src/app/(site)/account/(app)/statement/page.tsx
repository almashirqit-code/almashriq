import type { Metadata } from "next";
import { Printer } from "lucide-react";
import { requireActivePortal, getPortalStatement, ledgers } from "@/lib/portal";
import { StatementTable } from "@/components/statement-table";
import { Card, EmptyNote } from "../ui";

export const metadata: Metadata = { title: "Statement of account", robots: { index: false, follow: false } };

export default async function AccountStatement() {
  await requireActivePortal();
  const byCurrency = ledgers(await getPortalStatement());

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">All invoices and payments on your account, with the running balance. Quotations aren&apos;t included.</p>
        {byCurrency.size > 0 && (
          <a
            href="/account/print/statement"
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-brand-700"
          >
            <Printer className="h-4 w-4" /> Print / save as PDF
          </a>
        )}
      </div>
      {byCurrency.size === 0 ? (
        <EmptyNote>Nothing on your statement yet.</EmptyNote>
      ) : (
        <div className="grid gap-4">
          {[...byCurrency.entries()].map(([cur, rows]) => (
            <Card key={cur}>
              <h2 className="mb-2 text-lg font-black">{cur}</h2>
              <StatementTable currency={cur} rows={rows} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
