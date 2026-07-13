interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  index?: number;
  tag?: string; // e.g. "80% OF CAP"
  meterPct?: number; // budget track fill
  warn?: boolean; // gold accent for the budget/cost tile
}

// Control-room readout tile: index + Anton heading + big mono value, with an
// optional budget track. Gold accent when a value needs attention.
export default function MetricCard({
  label,
  value,
  sublabel,
  index,
  tag,
  meterPct,
  warn,
}: MetricCardProps) {
  return (
    <div className={`rounded-xl border bg-bg2 p-5 ${warn ? "border-gold" : "border-line"}`}>
      <div className="flex items-center gap-2.5">
        {index != null && (
          <span className="font-mono text-xs text-faint">{String(index).padStart(2, "0")}</span>
        )}
        <p className="wordmark flex-1 text-sm leading-none text-ink">{label}</p>
        {tag && (
          <span className="rounded border border-gold px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-gold">
            {tag}
          </span>
        )}
      </div>

      <div className={`my-3 h-px ${warn ? "bg-gold" : "bg-line"}`} />

      <p className={`font-mono text-3xl font-medium tabular-nums ${warn ? "text-gold" : "text-ink"}`}>
        {value}
      </p>
      {sublabel && <p className="mt-1 font-mono text-xs text-muted">{sublabel}</p>}

      {meterPct != null && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-line">
            <div
              className="h-full rounded-full bg-amber"
              style={{ width: `${Math.min(100, Math.max(2, meterPct))}%` }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted">{meterPct}%</span>
        </div>
      )}
    </div>
  );
}
