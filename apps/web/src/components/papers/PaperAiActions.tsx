import type { JSX } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { InlineError } from '@/components/ui/InlineError';
import { Spinner } from '@/components/ui/Spinner';
import { generateScript, summarizePaper } from '@/services/papersService';
import { errorMessage } from '@/utils/errorMessage';

function aiActionUserMessage(err: unknown): string {
  const raw = errorMessage(err, '');
  if (/openai api 키가 없습니다|OPENAI_API_KEY|openai.*not configured/i.test(raw)) {
    return (
      '논문 요약·Shorts 스크립트는 서버에서 OpenAI를 호출합니다. ' +
      '`apps/api/.env`에 `OPENAI_API_KEY`(보통 `sk-`로 시작)를 넣고 uvicorn을 재시작한 뒤 다시 눌러 주세요. ' +
      '키는 웹(`apps/web/.env`)이 아니라 API 쪽에만 두면 됩니다.'
    );
  }
  return errorMessage(err, '알 수 없는 오류');
}

function isOpenAiKeyMissingError(err: unknown): boolean {
  return /openai api 키가 없습니다|OPENAI_API_KEY|openai.*not configured/i.test(errorMessage(err, ''));
}

interface PaperAiActionsProps {
  paperId: string;
  hasSummary: boolean;
}

export function PaperAiActions(props: PaperAiActionsProps): JSX.Element {
  const qc = useQueryClient();

  const summarize = useMutation({
    mutationFn: () => summarizePaper(props.paperId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['paper', props.paperId] });
      await qc.invalidateQueries({ queryKey: ['saved-papers'] });
    },
  });

  const script = useMutation({
    mutationFn: () => generateScript(props.paperId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['paper', props.paperId] });
      await qc.invalidateQueries({ queryKey: ['saved-papers'] });
    },
  });

  return (
    <section className="rounded-3xl border border-teal-100 bg-white/80 p-5 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">BrainBite AI 실험대</h2>
          <p className="mt-1 text-xs text-slate-600">
            OpenAI GPT로 교육용 요약과 Shorts를 생성합니다 (의료 조언 아님).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={summarize.isPending}
            onClick={() => summarize.mutate()}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {summarize.isPending ? '요약 생성 중…' : '논문 요약 생성 / 갱신'}
          </button>
          <button
            type="button"
            disabled={script.isPending || !props.hasSummary}
            onClick={() => script.mutate()}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            title={!props.hasSummary ? '먼저 요약을 생성하세요.' : undefined}
          >
            {script.isPending ? '스크립트 생성 중…' : 'Shorts 스크립트 생성'}
          </button>
        </div>
      </div>

      {(summarize.isPending || script.isPending) && (
        <div className="mt-4">
          <Spinner label="AI가 실험 노트를 작성 중이에요…" />
        </div>
      )}

      {summarize.isError ? (
        <div className="mt-4">
          <InlineError title="요약 실패" message={aiActionUserMessage(summarize.error)}>
            {isOpenAiKeyMissingError(summarize.error) ? (
              <p className="text-sm text-rose-900">
                <Link to="/settings" className="font-semibold text-teal-900 underline decoration-teal-400">
                  설정
                </Link>
                에서 백엔드 환경 변수 안내를 확인할 수 있어요.
              </p>
            ) : null}
          </InlineError>
        </div>
      ) : null}

      {script.isError ? (
        <div className="mt-4">
          <InlineError title="스크립트 실패" message={aiActionUserMessage(script.error)}>
            {isOpenAiKeyMissingError(script.error) ? (
              <p className="text-sm text-rose-900">
                <Link to="/settings" className="font-semibold text-teal-900 underline decoration-teal-400">
                  설정
                </Link>
                에서 백엔드 환경 변수 안내를 확인할 수 있어요.
              </p>
            ) : null}
          </InlineError>
        </div>
      ) : null}
    </section>
  );
}
