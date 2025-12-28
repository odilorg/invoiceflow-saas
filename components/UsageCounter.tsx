'use client';

interface UsageCounterProps {
  used: number;
  limit: number | null | -1;
  label: string;
  className?: string;
}

export default function UsageCounter({ used, limit, label, className = '' }: UsageCounterProps) {
  // Handle unlimited
  const isUnlimited = limit === null || limit === -1;

  if (isUnlimited) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
        <span className="text-slate-500">{label}:</span>
        <span className="font-semibold text-slate-900">{used}</span>
        <span className="text-slate-400">/ unlimited</span>
      </div>
    );
  }

  // Calculate percentage
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

  // Determine color based on usage
  let colorClass = 'text-green-600';
  let barColorClass = 'bg-green-500';

  if (percentage >= 100) {
    colorClass = 'text-red-600';
    barColorClass = 'bg-red-500';
  } else if (percentage >= 80) {
    colorClass = 'text-amber-600';
    barColorClass = 'bg-amber-500';
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className={`font-semibold ${colorClass}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${barColorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
