import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

const DEFAULT_COLOR = "#1d4ed8"; // blue-700

interface ValueLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: number | string;
}

function ValueLabel({ x, y, width, value, suffix }: ValueLabelProps & { suffix: string }) {
  const numX = Number(x);
  const numY = Number(y);
  const numWidth = Number(width);
  if (Number.isNaN(numX) || Number.isNaN(numY) || Number.isNaN(numWidth)) return null;
  return (
    <text
      x={numX + numWidth / 2}
      y={numY - 12}
      textAnchor="middle"
      fill="#1e3a8a"
      fontSize={20}
      fontWeight={700}
      fontFamily="Open Sans, sans-serif"
    >
      {value}
      {suffix}
    </text>
  );
}

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
    <ResponsiveContainer width="100%" height={height} className="animate-fade-in">
      <BarChart data={data} margin={{ top: 32, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#1e3a8a", fontSize: 18, fontFamily: "Open Sans, sans-serif" }}
          axisLine={{ stroke: "#bfdbfe" }}
          tickLine={false}
        />
        <YAxis hide />
        <Bar
          dataKey="value"
          radius={[10, 10, 0, 0]}
          isAnimationActive={false}
          label={((props: ValueLabelProps) => (
            <ValueLabel {...props} suffix={valueSuffix} />
          )) as unknown as boolean}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? DEFAULT_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
