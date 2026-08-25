"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface GapDatum {
  themeId: string;
  label: string;
  gap: number; // jouw pct - gemiddelde pct
}

export default function GapBarChart({ data }: { data: GapDatum[] }) {
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24 }}>
          <CartesianGrid horizontal={false} stroke="#161A23" strokeOpacity={0.08} />
          <XAxis
            type="number"
            domain={["dataMin - 5", "dataMax + 5"]}
            tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}%`}
            tick={{ fill: "#161A23", fontSize: 11 }}
          />
          <YAxis type="category" dataKey="label" width={170} tick={{ fill: "#161A23", fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [`${value > 0 ? "+" : ""}${Math.round(value)}%`, "t.o.v. gemiddelde"]}
            contentStyle={{ borderRadius: 6, border: "1px solid rgba(22,26,35,0.1)", fontSize: 12 }}
          />
          <Bar dataKey="gap" radius={4}>
            {data.map((d) => (
              <Cell key={d.themeId} fill={d.gap < 0 ? "#D8432B" : "#4A5568"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
