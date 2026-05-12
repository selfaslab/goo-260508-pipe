import type { JSX, ReactNode } from 'react';

interface InlineErrorProps {
  title?: string;
  message: string;
  /** Extra actions or links below the message (e.g. “설정으로”) */
  children?: ReactNode;
}

export function InlineError(props: InlineErrorProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <div className="font-semibold">{props.title ?? '알림'}</div>
      <div className="mt-1 whitespace-pre-wrap text-rose-800">{props.message}</div>
      {props.children ? <div className="mt-3 text-rose-900">{props.children}</div> : null}
    </div>
  );
}
