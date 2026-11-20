import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface StatusLabelProps {
  status: string;
}

export function StatusLabel({ status }: StatusLabelProps) {
  const normalized = status.trim();

  if (normalized === 'Approved' || normalized === 'Available') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
        <span>{normalized}</span>
      </span>
    );
  }

  if (normalized === 'Pending' || normalized === 'Limited') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200 whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" aria-hidden="true" />
        <span>{normalized}</span>
      </span>
    );
  }

  if (normalized === 'Rejected' || normalized === 'Full') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 border border-red-200 whitespace-nowrap">
        <XCircle className="h-3.5 w-3.5 text-red-700 shrink-0" aria-hidden="true" />
        <span>{normalized}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200 whitespace-nowrap">
      <AlertCircle className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true" />
      <span>{normalized}</span>
    </span>
  );
}
