import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

const DEFAULT_COLOR = "#1d4ed8"; // blue-700

export function BarChartCard({
  data,
  valueSuffix = "",
  height = 420,
}: {
  data: BarDatum[];
  valueSuffix?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 24, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#1e3a8a", fontSize: 18, fontFamily: "Open Sans, sans-serif" }}
          axisLine={{ stroke: "#bfdbfe" }}
          tickLine={false}
        />
        <YAxis hide />
        <Bar dataKey="value" radius={[10, 10, 0, 0]} animationDuration={900} animationEasing="ease-out">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? DEFAULT_COLOR} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => `${v}${valueSuffix}`}
            style={{ fill: "#1e3a8a", fontSize: 20, fontWeight: 700, fontFamily: "Open Sans, sans-serif" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
