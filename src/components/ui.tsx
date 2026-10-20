import Link from "next/link";
import type { InvoiceStatus, VehicleStatus } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-xs font-medium text-slate-500 hover:text-brand-600">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const VEHICLE_COLORS: Record<VehicleStatus, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  reserved: "bg-amber-50 text-amber-700 ring-amber-600/20",
  sold: "bg-brand-50 text-brand-700 ring-brand-600/20",
  shipped: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-500/20",
  issued: "bg-brand-50 text-brand-700 ring-brand-600/20",
  partially_paid: "bg-amber-50 text-amber-700 ring-amber-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-red-50 text-red-600 ring-red-600/20",
};

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export function VehicleStatusBadge({ status, label }: { status: VehicleStatus; label: string }) {
  return <Badge className={VEHICLE_COLORS[status]}>{label}</Badge>;
}

export function InvoiceStatusBadge({ status, label }: { status: InvoiceStatus; label: string }) {
  return <Badge className={INVOICE_COLORS[status]}>{label}</Badge>;
}

export function PartsBadge({ label }: { label: string }) {
  return <Badge className="bg-rose-50 text-rose-700 ring-rose-600/20">🔧 {label}</Badge>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-12 text-center text-sm text-slate-500">{children}</div>;
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  makeHref,
  labels,
}: {
  page: number;
  pages: number;
  makeHref: (p: number) => string;
  labels: { previous: string; next: string; pageOf: string };
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
      <span className="text-slate-500">{labels.pageOf}</span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn-secondary" href={makeHref(page - 1)}>
            {labels.previous}
          </Link>
        ) : (
          <span className="btn-secondary opacity-40">{labels.previous}</span>
        )}
        {page < pages ? (
          <Link className="btn-secondary" href={makeHref(page + 1)}>
            {labels.next}
          </Link>
        ) : (
          <span className="btn-secondary opacity-40">{labels.next}</span>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
