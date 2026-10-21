import Link from "next/link";
import type { InvoiceStatus, VehicleStatus } from "@/lib/types";
import { branchFlag, branchName } from "@/lib/branches";

/** Vibrant accent palette used for icon chips, stat cards and module colours. */
export const TONES = {
  brand: { chip: "from-brand-500 to-brand-700 shadow-brand-500/30", bar: "from-brand-500 to-brand-700", soft: "bg-brand-50 text-brand-700" },
  violet: { chip: "from-jet-800 to-jet-950 shadow-black/25", bar: "from-cerulean-600 to-jet-900", soft: "bg-slate-100 text-jet-900" },
  emerald: { chip: "from-emerald-400 to-teal-600 shadow-emerald-500/30", bar: "from-emerald-400 to-teal-600", soft: "bg-emerald-50 text-emerald-700" },
  amber: { chip: "from-amber-400 to-orange-500 shadow-amber-500/30", bar: "from-amber-400 to-orange-500", soft: "bg-amber-50 text-amber-700" },
  sky: { chip: "from-cerulean-400 to-cerulean-700 shadow-cerulean-500/30", bar: "from-cerulean-400 to-cerulean-700", soft: "bg-cerulean-50 text-cerulean-700" },
  fuchsia: { chip: "from-brand-400 to-brand-600 shadow-brand-500/30", bar: "from-brand-400 to-brand-600", soft: "bg-brand-50 text-brand-700" },
  cyan: { chip: "from-cerulean-300 to-cerulean-600 shadow-cerulean-500/30", bar: "from-cerulean-300 to-cerulean-600", soft: "bg-cerulean-50 text-cerulean-700" },
  slate: { chip: "from-slate-500 to-slate-700 shadow-slate-500/30", bar: "from-slate-400 to-slate-600", soft: "bg-slate-100 text-slate-700" },
} as const;
export type Tone = keyof typeof TONES;

export function IconChip({ tone = "brand", children, size = "md" }: { tone?: Tone; children: React.ReactNode; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4" : "h-10 w-10 rounded-xl [&_svg]:h-5 [&_svg]:w-5";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-lg ${dims} ${TONES[tone].chip}`}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  icon,
  tone = "brand",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  icon?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        {icon && <IconChip tone={tone}>{icon}</IconChip>}
        <div className="min-w-0">
          {back && (
            <Link
              href={back.href}
              className="mb-1 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-brand-600 hover:ring-brand-200"
            >
              ← {back.label}
            </Link>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const VEHICLE_COLORS: Record<VehicleStatus, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  reserved: "bg-amber-50 text-amber-700 ring-amber-600/20",
  sold: "bg-violet-50 text-violet-700 ring-violet-600/20",
  shipped: "bg-sky-50 text-sky-700 ring-sky-600/20",
};

const INVOICE_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-500/20",
  issued: "bg-blue-50 text-blue-700 ring-blue-600/20",
  partially_paid: "bg-amber-50 text-amber-700 ring-amber-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-red-50 text-red-600 ring-red-600/20",
};

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

const Dot = () => <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />;

export function VehicleStatusBadge({ status, label }: { status: VehicleStatus; label: string }) {
  return (
    <Badge className={VEHICLE_COLORS[status]}>
      <Dot />
      {label}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status, label }: { status: InvoiceStatus; label: string }) {
  return (
    <Badge className={INVOICE_COLORS[status]}>
      <Dot />
      {label}
    </Badge>
  );
}

/** Source-branch chip with its flag ("🇸🇬 Singapore"). */
export function BranchBadge({ code }: { code: string | null | undefined }) {
  const flag = branchFlag(code);
  if (!code) return null;
  return (
    <Badge className="bg-white text-slate-700 ring-slate-300">
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} alt="" className="h-3 w-4 rounded-[2px] object-cover ring-1 ring-black/10" />
      )}
      {branchName(code)}
    </Badge>
  );
}

export function PartsBadge({ label }: { label: string }) {
  return <Badge className="bg-rose-50 text-rose-700 ring-rose-600/20">🔧 {label}</Badge>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center text-sm text-slate-500">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-xl">🗂️</span>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${TONES[tone].bar}`} />
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.08] transition group-hover:opacity-[0.14] ${TONES[tone].bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        {icon && <IconChip tone={tone} size="sm">{icon}</IconChip>}
      </div>
      <div className="mt-2 break-words text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl">{value}</div>
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

/** Numbered pagination: ‹ 1 2 3 4 5 … 518 › */
export function NumberedPagination({
  page,
  pages,
  makeHref,
}: {
  page: number;
  pages: number;
  makeHref: (p: number) => string;
}) {
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  const add = (n: number) => nums[nums.length - 1] !== n && nums.push(n);
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  if (start > 1) {
    add(1);
    if (start > 2) nums.push("…");
  }
  for (let i = start; i <= end; i++) add(i);
  if (end < pages) {
    if (end < pages - 1) nums.push("…");
    add(pages);
  }
  const cell = "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition";
  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} className={`${cell} text-slate-500 hover:bg-slate-100`}>
          ‹
        </Link>
      ) : (
        <span className={`${cell} text-slate-300`}>‹</span>
      )}
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`e${i}`} className={`${cell} text-slate-400`}>
            …
          </span>
        ) : (
          <Link
            key={n}
            href={makeHref(n)}
            className={`${cell} ${n === page ? "bg-gradient-to-br from-rose-500 to-brand-600 font-semibold text-white shadow-md shadow-brand-500/30" : "text-slate-700 hover:bg-white hover:shadow-sm"}`}
          >
            {n}
          </Link>
        )
      )}
      {page < pages ? (
        <Link href={makeHref(page + 1)} className={`${cell} text-slate-500 hover:bg-slate-100`}>
          ›
        </Link>
      ) : (
        <span className={`${cell} text-slate-300`}>›</span>
      )}
    </nav>
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
      <div className="card-head">
        <h2 className="card-title">
          <span className="h-4 w-1 rounded-full bg-gradient-to-b from-rose-500 to-brand-600" />
          {title}
        </h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
