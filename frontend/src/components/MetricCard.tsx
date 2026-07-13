interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  warn?: boolean;
}

// Control-room readout: uppercase mono label over a large mono value, so the
// numbers read like an instrument panel.
export default function MetricCard({ label, value, sublabel, warn }: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        warn ? "border-air bg-bg2" : "border-line bg-bg2"
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.13em] text-faint">{label}</p>
      <p
        className={`mt-2.5 font-mono text-3xl font-medium tabular-nums ${
          warn ? "text-air" : "text-ink"
        }`}
      >
        {value}
      </p>
      {sublabel && <p className="mt-1 font-mono text-xs text-muted">{sublabel}</p>}
    </div>
  );
}
