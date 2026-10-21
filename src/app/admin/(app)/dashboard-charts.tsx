"use client";

import {
  Bar,
  Cell,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const VIBE = ["#8b5cf6", "#ec4899", "#f97316", "#10b981", "#0ea5e9", "#f43f5e", "#eab308", "#06b6d4"];

const compact = (locale: string) =>
  new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { notation: "compact", maximumFractionDigits: 1 });

export function SalesChart({ data, locale }: { data: { label: string; value: number }[]; locale: string }) {
  const fmt = compact(locale);
  const full = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", { style: "currency", currency: "JPY" });
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="55%" stopColor="#d71920" />
              <stop offset="100%" stopColor="#9d174d" />
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
            cursor={{ fill: "#fff1f2" }}
            formatter={(v) => [full.format(Number(v)), ""]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 10px 25px -10px rgb(15 23 42 / 0.2)" }}
          />
          <Bar dataKey="value" fill="url(#salesGrad)" radius={[8, 8, 2, 2]} maxBarSize={36} />
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
            cursor={{ fill: "#fff1f2" }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 10px 25px -10px rgb(15 23 42 / 0.2)" }}
          />
          <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={VIBE[i % VIBE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
