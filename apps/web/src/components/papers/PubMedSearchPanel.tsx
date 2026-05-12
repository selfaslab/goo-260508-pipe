import type { FormEventHandler, JSX } from 'react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { PubMedSearchHit } from '@brainbite/shared-types';

import { PubMedHitCard } from '@/components/papers/PubMedHitCard';
import { InlineError } from '@/components/ui/InlineError';
import { Spinner } from '@/components/ui/Spinner';
import { searchPubMed } from '@/services/papersService';
import { useAppUiStore } from '@/stores/useAppUiStore';
import { errorMessage } from '@/utils/errorMessage';

export function PubMedSearchPanel(props: { children?: JSX.Element | null }): JSX.Element {
  const starter = useAppUiStore((s) => s.lastPubMedQuery);
  const setStarter = useAppUiStore((s) => s.setLastPubMedQuery);
  const [query, setQuery] = useState(starter);
  const [recentDays, setRecentDays] = useState(30);
  const [metaFirst, setMetaFirst] = useState(true);
  const [domainPriority, setDomainPriority] = useState(true);

  const searchMut = useMutation({
    mutationFn: async (): Promise<PubMedSearchHit[]> => {
      const res = await searchPubMed(query, {
        limit: 20,
        recentDays,
        metaAnalysisFirst: metaFirst,
        domainPriority,
      });
      setStarter(query);
      return res.results;
    },
  });

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    searchMut.reset();
    void searchMut.mutateAsync();
  };

  const results = searchMut.data ?? [];

  return (
    <section className="space-y-4">
      <form onSubmit={onSubmit} className="rounded-3xl border border-teal-100 bg-white/80 p-5 shadow-soft backdrop-blur">
        <label className="block text-sm font-semibold text-slate-900" htmlFor="pubmed-q">
          PubMed 검색
        </label>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <input
              id="pubmed-q"
              name="pubmed-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='예: "sleep health psychology" 같은 키워드'
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-teal-200 focus:ring-2"
            />
            <div className="mt-2 text-xs text-slate-500">
              NCBI E-utilities를 사용합니다. 너무 잦은 요청은 차단될 수 있어요.
            </div>
          </div>
          <button
            type="submit"
            disabled={searchMut.isPending || query.trim().length === 0}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searchMut.isPending ? '검색 중…' : '검색'}
          </button>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-3">
          <label className="text-xs text-slate-700">
            최근 N일
            <input
              type="number"
              min={1}
              max={365}
              value={recentDays}
              onChange={(e) => setRecentDays(Math.min(365, Math.max(1, Number(e.target.value) || 30)))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={metaFirst}
              onChange={(e) => setMetaFirst(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            meta-analysis 우선
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={domainPriority}
              onChange={(e) => setDomainPriority(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            psychology/brain/mental health 우선
          </label>
        </div>
      </form>

      {props.children ?? null}

      {searchMut.isPending ? (
        <div className="rounded-3xl border border-teal-100 bg-white/70 p-5">
          <Spinner label="PubMed 결과를 받아오는 중이에요…" />
        </div>
      ) : null}

      {searchMut.isError ? (
        <InlineError title="검색이 실패했어요." message={errorMessage(searchMut.error, '알 수 없는 오류')} />
      ) : null}

      {searchMut.isSuccess ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-800">{results.length}개 결과 표시 중</div>
          {results.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-600">
              검색 결과가 없습니다. 키워드를 바꿔보세요.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((hit) => (
                <PubMedHitCard key={hit.pmid} hit={hit} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
