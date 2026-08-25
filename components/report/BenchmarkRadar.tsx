"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export interface RadarDatum {
  themeId: string;
  label: string;
  jij: number;
  gemiddelde: number;
  beste: number;
}

export default function BenchmarkRadar({ data }: { data: RadarDatum[] }) {
  return (
    <div className="h-[420px] w-full sm:h-[480px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#161A23" strokeOpacity={0.1} />
          <PolarAngleAxis dataKey="label" tick={{ fill: "#161A23", fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#161A23", fontSize: 10 }} />
          <Radar name="Beste deelnemer" dataKey="beste" stroke="#2E9BE6" fill="#2E9BE6" fillOpacity={0.06} strokeWidth={2} />
          <Radar name="Gemiddelde" dataKey="gemiddelde" stroke="#4A5568" fill="#4A5568" fillOpacity={0.06} strokeWidth={2} />
          <Radar name="Jij" dataKey="jij" stroke="#D8432B" fill="#D8432B" fillOpacity={0.18} strokeWidth={2.5} />
          <Legend verticalAlign="top" height={32} />
          <Tooltip
            formatter={(value: number) => `${Math.round(value)}%`}
            contentStyle={{ borderRadius: 6, border: "1px solid rgba(22,26,35,0.1)", fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
