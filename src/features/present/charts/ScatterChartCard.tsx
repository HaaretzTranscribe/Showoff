import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { TransportIcon } from "./TransportIcon";

export interface ScatterPoint {
  x: number;
  y: number;
  /** Optional — when set, a small white icon for this method renders inside the point. */
  method?: string;
}

export interface ScatterGroup {
  name: string;
  color: string;
  points: ScatterPoint[];
}

interface PointShapeProps {
  cx?: number;
  cy?: number;
  payload?: { color: string; method?: string };
}

function PointShape({ cx, cy, payload }: PointShapeProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={9} fill={payload.color} />
      {payload.method && <TransportIcon method={payload.method} />}
    </g>
  );
}

/**
 * Renders every group as ONE flat Scatter series with a custom `shape`
 * (color + optional transport-method icon per point), rather than one
 * <Scatter> per group. Multiple same-domain series was suspected of
 * causing a rendering mixup — this removes the multi-series index
 * space entirely rather than chase the exact cause. Legend is
 * hand-built for the same reason: don't depend on Recharts inferring
 * it correctly from multiple series.
 */
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
  const points = groups.flatMap((group) =>
    group.points.map((point) => ({ ...point, color: group.color }))
  );

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
        {groups.map((group) => (
          <div key={group.name} className="flex items-center gap-2 text-sm text-blue-900">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: group.color }}
              aria-hidden="true"
            />
            {group.name}
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height} className="animate-fade-in">
        <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
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
          <Scatter
            data={points}
            isAnimationActive={false}
            shape={((props: PointShapeProps) => <PointShape {...props} />) as unknown as boolean}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
