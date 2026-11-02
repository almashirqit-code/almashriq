"use client";

import {
  Bar,
  Cell,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const VIBE = ["#007ba7", "#d71920", "#17181c", "#2ea8df", "#fca5a8", "#10b981", "#f59e0b", "#94a3b8"];

const compact = (locale: string) =>
  new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { notation: "compact", maximumFractionDigits: 1 });

export function SalesChart({ data, locale, currency = "JPY" }: { data: { label: string; value: number }[]; locale: string; currency?: string }) {
  const fmt = compact(locale);
  const full = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f76d72" />
              <stop offset="55%" stopColor="#d71920" />
              <stop offset="100%" stopColor="#95151a" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#64748b" />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="#64748b"
            width={56}
            tickFormatter={(v: number) => "¥" + fmt.format(v)}
          />
          <Tooltip
            cursor={{ fill: "#eaf6fc" }}
            formatter={(v) => [full.format(Number(v)), ""]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 10px 25px -10px rgb(15 23 42 / 0.2)" }}
          />
          <Bar dataKey="value" fill="url(#salesGrad)" radius={[8, 8, 2, 2]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Donut with the total in the middle and a legend that spells out every slice (value and %),
 * so the numbers can be read without hovering. More than 7 slices: the rest are "Other".
 * `currency` formats values as money; without it they are counts.
 */
export function PieBreakdown({
  data,
  locale,
  currency,
  centerLabel,
  otherLabel = "Other",
  emptyLabel = "—",
}: {
  data: { label: string; value: number }[];
  locale: string;
  currency?: string;
  centerLabel: string;
  otherLabel?: string;
  emptyLabel?: string;
}) {
  const loc = locale === "ja" ? "ja-JP" : "en-US";
  const fmt = currency
    ? new Intl.NumberFormat(loc, { style: "currency", currency, maximumFractionDigits: 0 })
    : new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  const short = currency ? new Intl.NumberFormat(loc, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }) : fmt;
  const sorted = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const slices = sorted.length > 8 ? [...sorted.slice(0, 7), { label: otherLabel, value: sorted.slice(7).reduce((s, d) => s + d.value, 0) }] : sorted;
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-slate-400">{emptyLabel}</p>;
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0" role="img" aria-label={`${centerLabel}: ${fmt.format(total)}. ${slices.map((d) => `${d.label} ${pct(d.value)}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={slices.length > 1 ? 2 : 0} stroke="none" isAnimationActive={false}>
              {slices.map((_, i) => (
                <Cell key={i} fill={VIBE[i % VIBE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [`${fmt.format(Number(v))} (${pct(Number(v))})`, String(n)]}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 10px 25px -10px rgb(15 23 42 / 0.2)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{centerLabel}</span>
          <span className="text-base font-bold tabular-nums text-slate-900">{short.format(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5 text-sm">
        {slices.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: VIBE[i % VIBE.length] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-slate-700" title={d.label}>
              {d.label}
            </span>
            <span className="tabular-nums text-slate-900">{fmt.format(d.value)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-slate-500">{pct(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
