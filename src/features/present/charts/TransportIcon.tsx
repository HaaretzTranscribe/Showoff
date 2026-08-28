/**
 * Small white glyphs (~12x12 units, meant to sit centered inside a
 * ~9-10px-radius scatter point) for each transport method from Q3/Q4.
 * Hand-drawn from basic SVG primitives rather than an icon library —
 * six icons didn't justify a new dependency. Kept deliberately simple
 * since they render tiny; not pixel-verified visually (this
 * environment can't screenshot), only confirmed to render the right
 * icon for the right method via DOM inspection.
 */
export function TransportIcon({ method }: { method: string }) {
  switch (method) {
    case "באוטובוס": // bus
      return (
        <g>
          <rect x={-5} y={-4} width={10} height={6} rx={1.5} fill="white" />
          <circle cx={-3} cy={3} r={1.3} fill="white" />
          <circle cx={3} cy={3} r={1.3} fill="white" />
        </g>
      );
    case "במכונית פרטית": // private car
      return (
        <g>
          <path d="M -5 1 L -3.5 -2 L 3.5 -2 L 5 1 Z" fill="white" />
          <rect x={-5.5} y={0.5} width={11} height={2.2} rx={1} fill="white" />
          <circle cx={-3} cy={3} r={1.2} fill="white" />
          <circle cx={3} cy={3} r={1.2} fill="white" />
        </g>
      );
    case "ברגל": // on foot
      return (
        <g stroke="white" strokeWidth={1.2} strokeLinecap="round" fill="none">
          <circle cx={0} cy={-3.3} r={1.3} fill="white" stroke="none" />
          <line x1={0} y1={-2} x2={0} y2={1.5} />
          <line x1={0} y1={1.5} x2={-2.5} y2={5} />
          <line x1={0} y1={1.5} x2={2.5} y2={5} />
          <line x1={0} y1={-0.5} x2={-2.4} y2={1.3} />
          <line x1={0} y1={-0.5} x2={2.4} y2={0.8} />
        </g>
      );
    case "באופניים": // bicycle
      return (
        <g stroke="white" strokeWidth={1} strokeLinecap="round" fill="none">
          <circle cx={-3} cy={2.6} r={2.1} />
          <circle cx={3} cy={2.6} r={2.1} />
          <line x1={-3} y1={2.6} x2={0} y2={-2} />
          <line x1={0} y1={-2} x2={3} y2={2.6} />
          <line x1={-1.1} y1={0.2} x2={3} y2={2.6} />
        </g>
      );
    case "באופניים חשמליים/קורקינט חשמלי": // e-bike / e-scooter
      return (
        <g stroke="white" strokeWidth={1.2} strokeLinecap="round">
          <line x1={-3} y1={-4} x2={-3} y2={1.5} />
          <line x1={-4.3} y1={-4} x2={-1.7} y2={-4} />
          <line x1={-3} y1={1.5} x2={3.5} y2={1.5} />
          <circle cx={-3} cy={3} r={1} fill="white" stroke="none" />
          <circle cx={3.5} cy={3} r={1} fill="white" stroke="none" />
        </g>
      );
    default: // "אחר" (other) and anything unrecognized
      return (
        <text x={0} y={2.5} textAnchor="middle" fill="white" fontSize={8} fontWeight={700}>
          ?
        </text>
      );
  }
}
