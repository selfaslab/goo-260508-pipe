import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { PaperAiActions } from '@/components/papers/PaperAiActions';
import { InlineError } from '@/components/ui/InlineError';
import { Spinner } from '@/components/ui/Spinner';
import { getSavedPaper } from '@/services/papersService';
import { errorMessage } from '@/utils/errorMessage';
import { pubmedArticleUrl } from '@/utils/pubmedUrl';

export function PaperDetailPage(): JSX.Element {
  const params = useParams();
  const paperId = params.paperId;

  const paper = useQuery({
    queryKey: ['paper', paperId ?? 'missing'],
    queryFn: () => {
      if (!paperId) throw new Error('paperId가 없습니다.');
      return getSavedPaper(paperId);
    },
    enabled: Boolean(paperId),
  });

  if (!paperId) {
    return (
      <InlineError title="잘못된 경로" message="논문 ID가 없습니다." />
    );
  }

  if (paper.isLoading) {
    return (
      <div className="rounded-3xl border border-teal-100 bg-white/70 p-6">
        <Spinner label="논문 상세를 불러오는 중…" />
      </div>
    );
  }

  if (paper.isError) {
    return (
      <div className="space-y-4">
        <Link to="/papers" className="text-sm font-semibold text-teal-800 hover:underline">
          ← 논문 목록으로
        </Link>
        <InlineError title="불러오기 실패" message={errorMessage(paper.error, '알 수 없는 오류')} />
      </div>
    );
  }

  const p = paper.data;
  if (!p) {
    return (
      <div className="space-y-4">
        <Link to="/papers" className="text-sm font-semibold text-teal-800 hover:underline">
          ← 논문 목록으로
        </Link>
        <InlineError title="데이터 없음" message="논문 정보를 찾을 수 없습니다." />
      </div>
    );
  }

  const hasSummary = Boolean(p.summary && p.summary.trim().length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <Link to="/papers" className="text-sm font-semibold text-teal-800 hover:underline">
            ← 논문 목록으로
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-teal-700">
            <span>PMID {p.pmid}</span>
            <a
              href={pubmedArticleUrl(p.pmid)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
            >
              PubMed 원문 새 창 ↗
            </a>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold leading-snug text-slate-900">
            <a
              href={pubmedArticleUrl(p.pmid)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-inherit hover:text-teal-900 hover:underline decoration-teal-300 underline-offset-2"
            >
              {p.title}
            </a>
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{p.journal ? p.journal : '저널 정보 없음'}</span>
            <span aria-hidden="true">•</span>
            <span>{p.publishedDate ? p.publishedDate : '출판일 불명'}</span>
            <span aria-hidden="true">•</span>
            <span>저장 시각 {new Date(p.createdAt).toLocaleString('ko-KR')}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-slate-100 px-2 py-1">타입: {p.paperType}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1">중요도 {p.importanceScore}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1">Shorts {p.shortsFitScore}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1">Longform {p.longformFitScore}</span>
          </div>
        </div>
        <Link
          to="/script"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
        >
          스크립트 도구로 →
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">초록</h2>
        {p.abstract ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{p.abstract}</p>
        ) : (
          <p className="mt-3 text-sm text-slate-500">초록이 없습니다.</p>
        )}
        {p.authors.length > 0 ? (
          <p className="mt-4 text-xs text-slate-500">저자: {p.authors.join(', ')}</p>
        ) : null}
        {p.keywords.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {p.keywords.map((k) => (
              <span key={k} className="rounded-full bg-lab-50 px-2 py-1 text-xs text-teal-900">
                {k}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <PaperAiActions paperId={p.id} hasSummary={hasSummary} />

      <section className="rounded-3xl border border-teal-100 bg-white/80 p-6 shadow-soft backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-900">요약</h2>
        {p.summary ? (
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{p.summary}</div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">아직 요약이 없습니다. 위에서 요약을 생성하세요.</p>
        )}
      </section>

      <section className="rounded-3xl border border-teal-100 bg-white/80 p-6 shadow-soft backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-900">Shorts 스크립트</h2>
        {p.script ? (
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{p.script}</div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            스크립트는 요약이 준비된 뒤 생성할 수 있습니다.
          </p>
        )}
      </section>
    </div>
  );
}
