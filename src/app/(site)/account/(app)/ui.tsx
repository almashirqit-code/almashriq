import Link from "next/link";

/** Small building blocks for the customer account pages (site glass look). */

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>;
}

export function Pill({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
}

export function SectionTitle({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between gap-3">
      <h2 className="text-lg font-black">{title}</h2>
      {href && link && (
        <Link href={href} className="text-sm font-bold text-brand-700 hover:underline">
          {link} →
        </Link>
      )}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="glass rounded-2xl p-6 text-center text-sm text-white/70">{children}</p>;
}

/** Label/value pair for detail grids. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{label}</dt>
      <dd className="truncate text-sm font-semibold">{children || "—"}</dd>
    </div>
  );
}
