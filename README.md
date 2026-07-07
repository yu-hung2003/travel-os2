interface Props {
  /** 0..1 */
  value: number;
  size?: number;
  label: string;
  sublabel?: string;
}

export function ProgressRing({ value, size = 92, label, sublabel }: Props) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth={stroke} fill="none"
          className="stroke-surface-3"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none tabular-nums">{label}</span>
        {sublabel && <span className="mt-0.5 text-[10px] text-ink-3">{sublabel}</span>}
      </div>
    </div>
  );
}
