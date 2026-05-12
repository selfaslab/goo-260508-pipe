import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { InlineError } from '@/components/ui/InlineError';
import { Spinner } from '@/components/ui/Spinner';
import { generateScript, listSavedPapers, summarizePaper } from '@/services/papersService';
import { errorMessage } from '@/utils/errorMessage';
import { pubmedArticleUrl } from '@/utils/pubmedUrl';

export function ScriptGeneratorPage(): JSX.Element {
  const saved = useQuery({
    queryKey: ['saved-papers'],
    queryFn: listSavedPapers,
  });

  const savedPapers = useMemo(() => saved.data ?? [], [saved.data]);

  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (selectedId) return;
    const first = savedPapers[0];
    if (first) setSelectedId(first.id);
  }, [savedPapers, selectedId]);

  const selected = useMemo(
    () => savedPapers.find((p) => p.id === selectedId),
    [savedPapers, selectedId],
  );

  const summarize = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('논문을 선택하세요.');
      return summarizePaper(selectedId);
    },
  });

  const script = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('논문을 선택하세요.');
      return generateScript(selectedId);
    },
  });

  const onSummarize = () => {
    void summarize.mutateAsync().then(async () => {
      await saved.refetch();
    });
  };

  const onScript = () => {
    void script.mutateAsync().then(async () => {
      await saved.refetch();
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
          Shorts 스크립트 생성기
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          요약이 있는 논문을 고르면 선인장 박사 톤의 대본 초안을 뽑을 수 있습니다. 세부 수정은 사람이 검토해주세요.
        </p>
      </header>

      {saved.isLoading ? (
        <div className="rounded-3xl border border-teal-100 bg-white/70 p-6">
          <Spinner label="논문 목록을 불러오는 중…" />
        </div>
      ) : saved.isError ? (
        <InlineError title="목록 로드 실패" message={errorMessage(saved.error, '알 수 없는 오류')} />
      ) : (
        <form className="space-y-4 rounded-3xl border border-teal-100 bg-white/80 p-6 shadow-soft backdrop-blur">
          <label className="block text-sm font-semibold text-slate-900" htmlFor="paper-select">
            대상 논문
          </label>
          <select
            id="paper-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-teal-200 focus:ring-2"
          >
            {savedPapers.length === 0 ? (
              <option value="">저장된 논문 없음</option>
            ) : (
              savedPapers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pmid} · {p.title.slice(0, 70)}
                  {p.title.length > 70 ? '…' : ''}
                </option>
              ))
            )}
          </select>

          {selected ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">미리보기</div>
              <div className="mt-2">
                요약 상태:{' '}
                <span className="font-semibold">{selected.summary ? '준비됨' : '없음'}</span>
              </div>
              <div className="mt-2">
                스크립트 상태:{' '}
                <span className="font-semibold">{selected.script ? '있음' : '없음'}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                <Link className="font-semibold text-teal-800 hover:underline" to={`/papers/${selected.id}`}>
                  상세 페이지로 이동 →
                </Link>
                <a
                  href={pubmedArticleUrl(selected.pmid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-teal-800 hover:underline"
                >
                  PubMed 원문 ↗
                </a>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onSummarize}
              disabled={!selectedId || summarize.isPending}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {summarize.isPending ? '요약 중…' : '선택 논문 요약 생성'}
            </button>
            <button
              type="button"
              onClick={onScript}
              disabled={!selectedId || script.isPending || !selected?.summary}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {script.isPending ? '스크립트 생성 중…' : 'Shorts 스크립트 생성'}
            </button>
          </div>

          {summarize.isError ? (
            <InlineError title="요약 실패" message={errorMessage(summarize.error, '알 수 없는 오류')} />
          ) : null}
          {script.isError ? (
            <InlineError title="스크립트 실패" message={errorMessage(script.error, '알 수 없는 오류')} />
          ) : null}

          {script.isSuccess ? (
            <div className="rounded-2xl border border-teal-200 bg-lab-50 p-4 text-sm text-slate-800">
              <div className="font-semibold">생성 완료</div>
              <div className="mt-2 whitespace-pre-wrap">{script.data.script}</div>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
