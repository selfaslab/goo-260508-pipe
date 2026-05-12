import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { PubMedSearchPanel } from '@/components/papers/PubMedSearchPanel';
import { SavedPaperRow } from '@/components/papers/SavedPaperRow';
import { InlineError } from '@/components/ui/InlineError';
import { Spinner } from '@/components/ui/Spinner';
import { listSavedPapers } from '@/services/papersService';
import { errorMessage } from '@/utils/errorMessage';

export function PapersPage(): JSX.Element {
  const saved = useQuery({
    queryKey: ['saved-papers'],
    queryFn: listSavedPapers,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">논문 탐색</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          PubMed에서 검색해 연구실에 저장하고, 상세 페이지에서 AI 요약과 Shorts 대본을 만듭니다.
        </p>
      </header>

      <PubMedSearchPanel />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">저장된 논문</h2>
            <p className="mt-1 text-sm text-slate-600">Supabase에 보관된 레코드입니다.</p>
          </div>
          <Link className="text-sm font-semibold text-teal-800 hover:underline" to="/settings">
            연결 상태 보기 →
          </Link>
        </div>

        {saved.isLoading ? (
          <div className="rounded-3xl border border-teal-100 bg-white/70 p-5">
            <Spinner label="저장된 논문을 불러오는 중…" />
          </div>
        ) : saved.isError ? (
          <InlineError
            title="저장 목록을 불러오지 못했습니다."
            message={errorMessage(saved.error, '알 수 없는 오류')}
          />
        ) : !saved.data || saved.data.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
            아직 저장된 논문이 없어요. 위에서 PubMed 검색 후 “내 연구실에 저장”을 눌러보세요.
          </div>
        ) : (
          <div className="space-y-3">
            {saved.data.map((p) => (
              <SavedPaperRow key={p.id} paper={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
