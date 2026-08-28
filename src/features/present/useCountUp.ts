import { useEffect, useState } from "react";

/** Animates from the previous value to `target` over `durationMs` — used by big-number cards. */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const from = value;
    const delta = target - from;

    if (delta === 0) return;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) * (1 - progress); // ease-out quad
      setValue(from + delta * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
