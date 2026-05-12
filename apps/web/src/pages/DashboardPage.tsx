import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
import { InlineError } from '@/components/ui/InlineError';
import { listSavedPapers, searchPubMed } from '@/services/papersService';
import { useAppUiStore } from '@/stores/useAppUiStore';
import { errorMessage } from '@/utils/errorMessage';

export function DashboardPage(): JSX.Element {
  const q = useAppUiStore((s) => s.lastPubMedQuery);

  const saved = useQuery({
    queryKey: ['saved-papers'],
    queryFn: listSavedPapers,
  });

  const probe = useQuery({
    queryKey: ['pubmed-probe', q],
    queryFn: async () => (await searchPubMed(q, { limit: 5 })).results.length,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-teal-100 bg-white/80 p-6 shadow-soft backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">BrainBite Lab</div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">
          오늘의 연구 파이프라인
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          PubMed에서 최신 건강심리·뇌과학 논문을 찾고, 요약한 뒤 YouTube Shorts 대본까지 한 흐름으로 실험해보세요.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-lab-50/60 p-4">
            <div className="text-xs font-semibold text-slate-500">저장된 논문</div>
            {saved.isLoading ? (
              <div className="mt-2">
                <Spinner label="집계 중…" />
              </div>
            ) : saved.isError ? (
              <div className="mt-2">
                <InlineError message={errorMessage(saved.error, '알 수 없는 오류')} />
              </div>
            ) : (
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {saved.data ? saved.data.length : 0}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">PubMed 프리뷰 (상위 5건)</div>
            {probe.isLoading ? (
              <div className="mt-2">
                <Spinner label="샘플 검색 중…" />
              </div>
            ) : probe.isError ? (
              <div className="mt-2">
                <InlineError message={errorMessage(probe.error, '알 수 없는 오류')} />
              </div>
            ) : (
              <div className="mt-2 text-2xl font-semibold text-slate-900">{probe.data}</div>
            )}
            <div className="mt-1 text-[11px] text-slate-500">키워드: {q}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">다음 단계</div>
            <div className="mt-2 text-sm text-slate-700">
              논문을 저장한 뒤 <span className="font-semibold">요약</span>을 만들고, Shorts{' '}
              <span className="font-semibold">스크립트</span>를 생성하세요.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/papers"
                className="inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                논문 탐색으로
              </Link>
              <Link
                to="/script"
                className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
              >
                스크립트 생성
              </Link>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
