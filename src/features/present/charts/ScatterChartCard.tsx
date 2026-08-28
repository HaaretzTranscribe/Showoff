import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";

export interface ScatterPoint {
  x: number;
  y: number;
}

export interface ScatterGroup {
  name: string;
  color: string;
  points: ScatterPoint[];
}

export function ScatterChartCard({
  groups,
  xLabel,
  yLabel,
  height = 460,
}: {
  groups: ScatterGroup[];
  xLabel: string;
  yLabel: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height} className="animate-fade-in">
      <ScatterChart margin={{ top: 24, right: 24, bottom: 24, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tick={{ fill: "#1e3a8a", fontSize: 14, fontFamily: "Open Sans, sans-serif" }}
          label={{ value: xLabel, position: "insideBottom", offset: -10, fill: "#1e3a8a" }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tick={{ fill: "#1e3a8a", fontSize: 14, fontFamily: "Open Sans, sans-serif" }}
          label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#1e3a8a" }}
        />
        <Legend wrapperStyle={{ fontFamily: "Open Sans, sans-serif" }} />
        {groups.map((group) => (
          <Scatter
            key={group.name}
            name={group.name}
            data={group.points}
            fill={group.color}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
