"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const compact = (locale: string) =>
  new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { notation: "compact", maximumFractionDigits: 1 });

export function SalesChart({ data, locale }: { data: { label: string; value: number }[]; locale: string }) {
  const fmt = compact(locale);
  const full = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { style: "currency", currency: "JPY" });
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            cursor={{ fill: "#f1f5f9" }}
            formatter={(v) => [full.format(Number(v)), ""]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar dataKey="value" fill="#1d58f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MakesChart({ data }: { data: { make: string; count: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="make" tickLine={false} axisLine={false} fontSize={12} width={84} stroke="#475569" />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar dataKey="count" fill="#3378fc" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
