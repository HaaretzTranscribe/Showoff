import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { BarDatum } from "./BarChartCard";

const BLUE = "#1d4ed8";
const FONT = "Open Sans, sans-serif";

/**
 * A trend across ordered groups (left to right), with each point's value
 * above it. Recharts' own animation is off (see the bar-chart note in
 * index.css); instead the wrapper div reveals left to right once on mount
 * (.line-reveal) — an HTML element that stays mounted across live
 * updates, so the reveal doesn't replay on every poll.
 */
export function LineChartCard({
  data,
  valueSuffix = "",
  yMax = 100,
  height = 420,
}: {
  data: BarDatum[];
  valueSuffix?: string;
  yMax?: number;
  height?: number;
}) {
  return (
    <div className="line-reveal flex-1" dir="ltr">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 40, right: 48, bottom: 8, left: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#1e3a8a", fontSize: 18, fontFamily: FONT }}
            axisLine={{ stroke: "#bfdbfe" }}
            tickLine={false}
            padding={{ left: 24, right: 24 }}
          />
          <YAxis hide domain={[0, yMax]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={BLUE}
            strokeWidth={6}
            strokeLinecap="round"
            dot={{ r: 10, fill: "#fff", stroke: BLUE, strokeWidth: 5 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="top"
              offset={20}
              formatter={(v: unknown) => `${v}${valueSuffix}`}
              style={{ fill: "#1e3a8a", fontSize: 22, fontWeight: 800, fontFamily: FONT }}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
