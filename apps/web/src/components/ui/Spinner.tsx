import type { JSX } from 'react';

interface SpinnerProps {
  label?: string;
}

export function Spinner(props: SpinnerProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600" role="status" aria-live="polite">
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-lab-200 border-t-teal-600" />
      <span>{props.label ?? '불러오는 중입니다…'}</span>
    </div>
  );
}
