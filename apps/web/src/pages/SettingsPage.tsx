import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';

import { InlineError } from '@/components/ui/InlineError';
import { Spinner } from '@/components/ui/Spinner';
import { fetchJson, getApiBaseUrl } from '@/services/apiClient';
import { errorMessage } from '@/utils/errorMessage';

type HealthResponse = {
  status: string;
  service: string;
  supabase_configured?: boolean;
  supabase_env_filled?: boolean;
  supabase_issue?: 'missing_env' | 'invalid_credentials' | null;
  papers_save_v2?: boolean;
  openai_configured?: boolean;
  dotenv_apps_api_exists?: boolean;
  dotenv_repo_root_exists?: boolean;
};

export function SettingsPage(): JSX.Element {
  const apiBase = getApiBaseUrl();

  const health = useQuery({
    queryKey: ['api-health'],
    queryFn: () => fetchJson<HealthResponse>('/api/health'),
    retry: 0,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">설정</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          MVP는 환경 변수로 연결 정보를 주입합니다. 실제 키는 코드에 넣지 말고 배포 콘솔에만 저장하세요.
        </p>
      </header>

      <section className="rounded-3xl border border-teal-100 bg-white/80 p-6 shadow-soft backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-900">프론트엔드</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div>
            <span className="font-semibold">VITE_API_BASE_URL</span>:{' '}
            <span className="break-all text-slate-900">
              {apiBase ||
                (import.meta.env.DEV
                  ? '(비움 — 같은 출처 /api → Vite 프록시 → http://127.0.0.1:8000)'
                  : '(비움 — 프로덕션에서는 반드시 API URL을 넣으세요)')}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            로컬에서는 FastAPI를 8000에서 띄우고, 여기에는 <span className="font-medium">5173이 아닌</span> API 주소만 넣거나
            비워 두세요. `apps/web/.env` · Vercel 환경 변수.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-100 bg-amber-50/40 p-6 shadow-soft backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-900">Supabase — “내 연구실에 저장” 쓰기</h2>
        <p className="mt-2 text-sm text-slate-700">
          저장·상세·요약 DB는 Supabase Postgres를 씁니다. 아래를 끝내면 저장 버튼이 동작합니다.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-teal-900 underline"
            >
              Supabase 대시보드
            </a>
            에서 프로젝트 생성
          </li>
          <li>
            <span className="font-semibold">Settings → API</span>: Project URL →{' '}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">SUPABASE_URL</code>, service_role 키 →{' '}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> 로{' '}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">apps/api/.env</code>에 저장 (Git에 올리지 마세요)
          </li>
          <li>
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">supabase/migrations</code>의 SQL을 대시보드{' '}
            <span className="font-semibold">SQL Editor</span>에서 파일 이름 순서대로 실행
          </li>
          <li>
            로컬이면 터미널에서 FastAPI(uvicorn)를 <span className="font-semibold">한 번 재시작</span>한 뒤, 이 페이지의
            “백엔드 헬스”에서 Supabase가 <span className="font-semibold">연결됨</span>인지 확인
          </li>
        </ol>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-white/80 p-6 shadow-soft backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-900">백엔드 헬스</h2>
        <div className="mt-3">
          {health.isLoading ? <Spinner label="API 연결 확인 중…" /> : null}
          {health.isError ? (
            <InlineError
              title="API에 연결하지 못했습니다."
              message={
                `${errorMessage(health.error, '알 수 없는 오류')}\n\n` +
                `FastAPI가 실행 중인지, CORS_ORIGINS에 이 웹 앱 출처가 포함됐는지 확인하세요.`
              }
            />
          ) : null}
          {health.isSuccess ? (
            <div className="rounded-2xl border border-teal-200 bg-lab-50 p-4 text-sm text-slate-800">
              <div>
                상태: <span className="font-semibold">{health.data.status}</span>
              </div>
              <div className="mt-1">
                서비스: <span className="font-semibold">{health.data.service}</span>
              </div>
              <div className="mt-1">
                OpenAI (요약·스크립트):{' '}
                <span className="font-semibold">
                  {health.data.openai_configured === true
                    ? '키 로드됨'
                    : health.data.openai_configured === false
                      ? '키가 비어 있음'
                      : '알 수 없음(API 재시작 후 새로고침)'}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                .env 파일: apps/api{' '}
                <span className="font-semibold">{health.data.dotenv_apps_api_exists === true ? '있음' : '없음'}</span>
                {' · '}저장소 루트{' '}
                <span className="font-semibold">{health.data.dotenv_repo_root_exists === true ? '있음' : '없음'}</span>
              </div>
              {health.data.openai_configured !== true ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-700">
                  {health.data.dotenv_apps_api_exists === true ? (
                    <>
                      <code className="rounded bg-white/80 px-1">apps/api/.env</code>는 있는데 키가 안 읽혔습니다.{' '}
                      <span className="font-semibold">OPENAI_API_KEY=sk-...</span> 한 줄(앞뒤 공백·잘못된 따옴표 없이)인지
                      확인하고, 저장 후 <span className="font-semibold">uvicorn을 껐다 켜기</span> 하세요. 요약 오류가
                      영어 <code className="rounded bg-white/80 px-1">OPENAI_API_KEY is not configured</code>이면 예전
                      API 프로세스일 수 있으니 8000 포트 프로세스를 모두 종료한 뒤 이 저장소에서 다시 실행하세요.
                    </>
                  ) : (
                    <>
                      <code className="rounded bg-white/80 px-1">apps/api/.env</code>가 없거나 다른 폴더에 있습니다.
                      키는 <code className="rounded bg-white/80 px-1">apps/api/.env</code> 또는 저장소 루트{' '}
                      <code className="rounded bg-white/80 px-1">.env</code>에 두세요.
                    </>
                  )}
                </p>
              ) : null}
              <div className="mt-1">
                Supabase:{' '}
                <span className="font-semibold">
                  {health.data.supabase_configured ? '연결됨' : '미설정 (저장·상세 DB 기능 비활성)'}
                </span>
              </div>
              {!health.data.supabase_configured && health.data.supabase_issue === 'invalid_credentials' ? (
                <p className="mt-2 text-xs text-amber-900">
                  환경 변수는 채워졌는데 클라이언트 생성에 실패했습니다. <span className="font-semibold">service_role</span> JWT(보통{' '}
                  <span className="font-semibold">eyJ</span>로 시작하는 긴 문자열)를 썼는지 확인하고 API를 재시작하세요.{' '}
                  <span className="font-semibold">anon</span> 키나 잘린 문자열이면 안 됩니다.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-teal-100 bg-white/80 p-6 shadow-soft backdrop-blur">
        <h2 className="text-sm font-semibold text-slate-900">백엔드 환경 변수 (Railway)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <span className="font-semibold">SUPABASE_URL</span>,{' '}
            <span className="font-semibold">SUPABASE_SERVICE_ROLE_KEY</span>
          </li>
          <li>
            <span className="font-semibold">OPENAI_API_KEY</span>
          </li>
          <li>
            <span className="font-semibold">CORS_ORIGINS</span> (쉼표로 여러 출처)
          </li>
          <li>
            <span className="font-semibold">NCBI_EMAIL</span>, <span className="font-semibold">NCBI_API_KEY</span>{' '}
            (선택)
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Supabase SQL은 `supabase/migrations`의 파일을 번호 순서대로 대시보드 SQL Editor에서 실행하면 됩니다.
        </p>
      </section>
    </div>
  );
}
