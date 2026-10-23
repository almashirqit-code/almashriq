import { money } from "@/lib/format";
import { fmtDate, type StatementRow } from "@/lib/portal";
import type { Currency } from "@/lib/types";

/**
 * Statement of account ledger for one currency: invoices (debit), payments (credit), running balance.
 * Uses opacity instead of theme colours so it reads the same on the website and on the white print page.
 */
export function StatementTable({ currency, rows }: { currency: Currency; rows: StatementRow[] }) {
  const closing = rows.length ? Number(rows[rows.length - 1].balance) : 0;
  const debit = rows.reduce((s, r) => s + Number(r.debit), 0);
  const credit = rows.reduce((s, r) => s + Number(r.credit), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide opacity-70">
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Reference</th>
            <th className="py-2 pr-3">Details</th>
            <th className="py-2 pr-3 text-right">Invoiced</th>
            <th className="py-2 pr-3 text-right">Paid</th>
            <th className="py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-current/10">
              <td className="whitespace-nowrap py-2 pr-3">{fmtDate(r.entry_date)}</td>
              <td className="whitespace-nowrap py-2 pr-3 font-semibold">{r.ref}</td>
              <td className="py-2 pr-3 opacity-80">{r.detail}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{Number(r.debit) ? money(r.debit, currency) : ""}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{Number(r.credit) ? money(r.credit, currency) : ""}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{money(r.balance, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-current/30 font-bold">
            <td className="py-2 pr-3" colSpan={3}>
              Totals
            </td>
            <td className="py-2 pr-3 text-right tabular-nums">{money(debit, currency)}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{money(credit, currency)}</td>
            <td className="py-2 text-right text-base font-black tabular-nums">{money(closing, currency)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-1 text-right text-xs opacity-70">{closing > 0.005 ? "Balance due" : closing < -0.005 ? "In your favour" : "Settled"}</p>
    </div>
  );
}
