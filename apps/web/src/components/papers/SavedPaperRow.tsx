import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import type { PaperRecord } from '@brainbite/shared-types';

import { pubmedArticleUrl } from '@/utils/pubmedUrl';

interface SavedPaperRowProps {
  paper: PaperRecord;
}

export function SavedPaperRow(props: SavedPaperRowProps): JSX.Element {
  const p = props.paper;
  const pubmedHref = pubmedArticleUrl(p.pmid);

  const badges = [
    p.summary ? '요약' : null,
    p.script ? '스크립트' : null,
  ].filter((x): x is string => x !== null);

  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-slate-200/70 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-start sm:justify-between">
      <Link
        to={`/papers/${p.id}`}
        className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 focus-visible:ring-offset-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-teal-700">PMID {p.pmid}</div>
          <div className="text-[11px] text-slate-400">{new Date(p.createdAt).toLocaleString('ko-KR')}</div>
        </div>
        <div className="mt-1 text-sm font-semibold leading-snug text-slate-900">{p.title}</div>
        <div className="mt-2 text-xs text-slate-500">{p.journal ? p.journal : '저널 정보 없음'}</div>
      </Link>
      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <a
          href={pubmedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-center text-xs font-semibold text-teal-900 hover:bg-teal-100"
        >
          PubMed 원문 ↗
        </a>
        <div className="flex flex-wrap justify-end gap-2">
          {badges.length === 0 ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              새로 저장됨
            </span>
          ) : (
            badges.map((b) => (
              <span key={b} className="rounded-full bg-lab-100 px-3 py-1 text-xs font-semibold text-teal-900">
                {b}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
