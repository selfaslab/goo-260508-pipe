import type { JSX } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { PubMedSearchHit } from '@brainbite/shared-types';

import { InlineError } from '@/components/ui/InlineError';
import { fetchJson } from '@/services/apiClient';
import { savePaper } from '@/services/papersService';
import {
  isLegacyFailedToSavePaperApiError,
  isSupabasePaperSaveError,
  paperSaveErrorMessage,
  paperSaveErrorTitle,
} from '@/utils/paperSaveErrorMessage';
import { pubmedArticleUrl } from '@/utils/pubmedUrl';

type HealthPayload = {
  status: string;
  service: string;
  supabase_configured?: boolean;
  supabase_env_filled?: boolean;
  supabase_issue?: 'missing_env' | 'invalid_credentials' | null;
  /** Present on current API; missing on old builds that return "Failed to save paper." */
  papers_save_v2?: boolean;
};

interface PubMedHitCardProps {
  hit: PubMedSearchHit;
}

export function PubMedHitCard(props: PubMedHitCardProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const qc = useQueryClient();
  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: () => fetchJson<HealthPayload>('/api/health'),
    staleTime: 60_000,
    retry: 1,
  });
  const configured = health.data?.supabase_configured;
  const issue = health.data?.supabase_issue;
  const saveBlocked = health.isSuccess && configured === false;

  const save = useMutation({
    mutationFn: () =>
      savePaper({
        pmid: props.hit.pmid,
        title: props.hit.title,
        abstract: props.hit.abstract ?? null,
        authors: props.hit.authors,
        journal: props.hit.journal ?? null,
        publishedDate: props.hit.publishedDate ?? null,
        keywords: props.hit.keywords,
        paperType: props.hit.paperType,
        importanceScore: props.hit.importanceScore,
        shortsFitScore: props.hit.shortsFitScore,
        longformFitScore: props.hit.longformFitScore,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['saved-papers'] });
    },
  });

  return (
    <article className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="text-xs font-semibold text-teal-700">PubMed PMID {props.hit.pmid}</div>
            <a
              href={pubmedArticleUrl(props.hit.pmid)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
            >
              원문 새 창 ↗
            </a>
          </div>
          <h3 className="mt-1 text-base font-semibold leading-snug text-slate-900">
            <a
              href={pubmedArticleUrl(props.hit.pmid)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-inherit hover:text-teal-900 hover:underline decoration-teal-300 underline-offset-2"
            >
              {props.hit.title}
            </a>
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{props.hit.journal ? props.hit.journal : '저널 정보 없음'}</span>
            <span aria-hidden="true">
              •
            </span>
            <span>{props.hit.publishedDate ? props.hit.publishedDate : '출판일 불명'}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-lab-100 px-2 py-1 font-semibold text-teal-900">
              {props.hit.paperType}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              중요도 {props.hit.importanceScore}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              Shorts {props.hit.shortsFitScore}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              Longform {props.hit.longformFitScore}
            </span>
          </div>
          {props.hit.abstract ? (
            <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-700">
              {props.hit.abstract}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">초록 없음 또는 PubMed 원문에 포함되지 않음.</p>
          )}
          {props.hit.authors.length > 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              저자 샘플: {props.hit.authors.slice(0, 3).join(', ')}
              {props.hit.authors.length > 3 ? ' 등' : ''}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 md:w-[160px]">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="mb-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            상세 보기
          </button>
          <button
            type="button"
            disabled={save.isPending || health.isLoading || saveBlocked}
            onClick={() => save.mutate()}
            className="w-full rounded-2xl bg-gradient-to-br from-teal-500 to-lab-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {save.isPending ? '저장 중…' : '내 연구실에 저장'}
          </button>
          {saveBlocked ? (
            <p className="mt-2 text-center text-[11px] leading-snug text-amber-900">
              {issue === 'invalid_credentials' ? (
                <>
                  <span className="font-semibold">Supabase URL·키는 있는데 연결이 안 됐어요.</span> 대시보드{' '}
                  <span className="font-semibold">Settings → API</span>에서 이름이 <span className="font-semibold">service_role</span>인
                  긴 JWT(보통 <span className="font-semibold">eyJ</span>로 시작)를 통째로 복사해 넣고, API(uvicorn)를 재시작해 주세요.
                </>
              ) : (
                <>
                  저장하려면 Supabase 정보가 필요해요.{' '}
                  <Link to="/settings" className="font-semibold underline">
                    설정
                  </Link>
                  에서 단계를 따라 <span className="font-semibold">apps/api/.env</span>를 채워 주세요.
                </>
              )}
            </p>
          ) : null}
          {save.isSuccess ? (
            <p className="mt-2 text-center text-xs text-teal-700">저장됨 ✅</p>
          ) : null}
        </div>
      </div>

      {save.isError ? (
        <div className="mt-4">
          <InlineError title={paperSaveErrorTitle(save.error)} message={paperSaveErrorMessage(save.error)}>
            {isSupabasePaperSaveError(save.error) ? (
              <div className="space-y-2 text-sm text-rose-900">
                <p className="font-medium">다음 순서로 진행해 주세요.</p>
                <ol className="list-decimal space-y-1.5 pl-5 text-rose-800">
                  <li>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline decoration-rose-400 underline-offset-2"
                    >
                      Supabase
                    </a>
                    에서 프로젝트 생성 → <span className="font-semibold">Settings → API</span>에서 URL·
                    <span className="font-semibold">service_role</span> 키 복사
                  </li>
                  <li>
                    프로젝트 폴더의 <code className="rounded bg-rose-100 px-1 py-0.5 text-xs">apps/api/.env</code>에{' '}
                    <span className="font-semibold">SUPABASE_URL</span>,{' '}
                    <span className="font-semibold">SUPABASE_SERVICE_ROLE_KEY</span> 붙여넣기
                  </li>
                  <li>
                    <code className="rounded bg-rose-100 px-1 py-0.5 text-xs">supabase/migrations</code> SQL을 대시보드
                    SQL Editor에서 순서대로 실행
                  </li>
                  <li>터미널에서 FastAPI(uvicorn) 재시작 후 이 페이지 새로고침</li>
                </ol>
                <p>
                  <Link to="/settings" className="font-semibold text-teal-900 underline decoration-teal-400">
                    설정 화면에서 연결 상태 확인 →
                  </Link>
                </p>
              </div>
            ) : null}
            {isLegacyFailedToSavePaperApiError(save.error) && health.isSuccess ? (
              <p className="mt-3 border-t border-rose-200/80 pt-3 text-xs leading-relaxed text-rose-800">
                {health.data.papers_save_v2 === true ? (
                  <>
                    API는 최신입니다. 개발자 도구 → 네트워크에서 <code className="rounded bg-rose-100 px-1">POST /api/papers</code> 응답
                    본문을 확인해 주세요.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">해야 할 일:</span> 이 저장소의{' '}
                    <code className="rounded bg-rose-100 px-1">apps/api</code>에서 uvicorn을 다시 실행해{' '}
                    <code className="rounded bg-rose-100 px-1">/api/health</code>에{' '}
                    <code className="rounded bg-rose-100 px-1">papers_save_v2: true</code>가 나오게 하세요. (다른
                    폴더·옛 코드로 떠 있는 8000번 프로세스가 있으면 그걸 먼저 종료하세요.)
                  </>
                )}
              </p>
            ) : null}
          </InlineError>
        </div>
      ) : null}
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 flex-1 text-lg font-semibold text-slate-900">
                <a
                  href={pubmedArticleUrl(props.hit.pmid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-inherit hover:text-teal-900 hover:underline decoration-teal-300 underline-offset-2"
                >
                  {props.hit.title}
                </a>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold"
              >
                닫기
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span>PMID {props.hit.pmid}</span>
              <span aria-hidden="true">•</span>
              <a
                href={pubmedArticleUrl(props.hit.pmid)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
              >
                PubMed 원문 새 창 ↗
              </a>
              <span aria-hidden="true">•</span>
              <span>{props.hit.journal ?? '저널 정보 없음'}</span>
              <span aria-hidden="true">•</span>
              <span>{props.hit.publishedDate ?? '출판일 불명'}</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3 text-xs">중요도: {props.hit.importanceScore}</div>
              <div className="rounded-2xl bg-slate-50 p-3 text-xs">Shorts 적합도: {props.hit.shortsFitScore}</div>
              <div className="rounded-2xl bg-slate-50 p-3 text-xs">Longform 적합도: {props.hit.longformFitScore}</div>
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold">초록</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {props.hit.abstract ?? '초록 없음'}
              </p>
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold">키워드</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {props.hit.keywords.length > 0 ? (
                  props.hit.keywords.map((kw) => (
                    <span key={kw} className="rounded-full bg-lab-50 px-2 py-1 text-xs text-teal-900">
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">키워드 없음</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
