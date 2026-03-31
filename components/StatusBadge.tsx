interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status?.toUpperCase() || 'UNKNOWN';

  let colorClass = 'bg-slate-100 text-slate-700';
  if (s === 'ACTIVE') {
    colorClass = 'bg-green-100 text-green-700 font-semibold';
  } else if (s === 'PAUSED') {
    colorClass = 'bg-amber-100 text-amber-700';
  } else if (s === 'ARCHIVED' || s === 'DELETED') {
    colorClass = 'bg-red-100 text-red-700';
  } else if (s === 'IN_PROCESS' || s === 'PENDING_REVIEW' || s === 'PENDING_BILLING_INFO') {
    colorClass = 'bg-blue-100 text-blue-700';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] md:text-xs font-medium uppercase tracking-wider ${colorClass}`}>
      {s.replace(/_/g, ' ')}
    </span>
  );
}
