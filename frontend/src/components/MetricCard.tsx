interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  warn?: boolean;
}

export default function MetricCard({ label, value, sublabel, warn }: MetricCardProps) {
  const cardClass = warn
    ? "rounded-lg border border-red-300 bg-red-50 p-6"
    : "rounded-lg border border-gray-200 bg-white p-6";
  const valueClass = warn ? "text-2xl font-semibold text-red-700" : "text-2xl font-semibold";

  return (
    <div className={cardClass}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={valueClass}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-gray-500">{sublabel}</p>}
    </div>
  );
}
