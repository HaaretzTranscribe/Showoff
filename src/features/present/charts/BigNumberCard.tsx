import { useCountUp } from "../useCountUp";

export function BigNumberCard({
  value,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const animated = useCountUp(value);

  return (
    <div className="flex flex-1 items-center justify-center">
      <span className="animate-fade-in-up text-8xl font-extrabold text-blue-700 tabular-nums sm:text-9xl">
        {animated.toFixed(decimals)}
        <span className="ms-2 text-4xl font-semibold text-blue-400 sm:text-5xl">{suffix}</span>
      </span>
    </div>
  );
}
