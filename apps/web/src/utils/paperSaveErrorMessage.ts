import { ApiError } from '@/services/apiClient';

import { errorMessage } from './errorMessage';

function rawDetail(err: unknown): string {
  return errorMessage(err, '').trim();
}

function lowerRaw(err: unknown): string {
  return rawDetail(err).toLowerCase();
}

/** Env missing, invalid key, or explicit “not configured” from any API version. */
export function isSupabasePaperSaveError(err: unknown): boolean {
  const low = lowerRaw(err);
  if (!low) {
    return false;
  }
  if (
    low.includes('supabase is not configured') ||
    low.includes('supabase client unavailable') ||
    low.includes('supabase에 연결할 수 없습니다')
  ) {
    return true;
  }
  if (low.includes('supabase_url') && low.includes('supabase_service_role_key')) {
    return true;
  }
  if (err instanceof ApiError && err.status === 503 && low.includes('supabase')) {
    return true;
  }
  return false;
}

function isDuplicatePmidError(err: unknown): boolean {
  const low = lowerRaw(err);
  return (
    low.includes('already exists') ||
    low.includes('23505') ||
    (err instanceof ApiError && err.status === 409)
  );
}

/** Old API path that hid PostgREST errors behind this English string. */
export function isLegacyFailedToSavePaperApiError(err: unknown): boolean {
  return /failed to save paper\.?/i.test(rawDetail(err));
}

/** Card title: Korean only, avoids generic title + English body. */
export function paperSaveErrorTitle(err: unknown): string {
  if (isSupabasePaperSaveError(err)) {
    return 'Supabase 설정이 필요해요';
  }
  if (isDuplicatePmidError(err)) {
    return '이미 저장된 논문이에요';
  }
  if (isLegacyFailedToSavePaperApiError(err)) {
    return '저장에 실패했어요';
  }
  if (err instanceof ApiError && err.status === 502) {
    return '저장에 실패했어요';
  }
  return '저장할 수 없어요';
}

/** Body text under the title. */
export function paperSaveErrorMessage(err: unknown): string {
  if (isSupabasePaperSaveError(err)) {
    return (
      'Supabase 프로젝트 URL과 service_role 키를 apps/api/.env에 넣고, ' +
      'API 서버(uvicorn)를 재시작한 뒤 이 페이지를 새로고침해 주세요.'
    );
  }
  if (isDuplicatePmidError(err)) {
    return '같은 PMID 논문은 한 번만 저장할 수 있어요. 저장 목록에서 확인해 보세요.';
  }
  if (isLegacyFailedToSavePaperApiError(err)) {
    return (
      '예전 API는 "Failed to save paper."만 보여 줍니다. 실행 중인 uvicorn을 모두 끄고, ' +
      '이 저장소의 apps/api 폴더에서 `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`으로 다시 띄운 뒤 새로고침하세요. ' +
      '`/api/health` JSON에 `"papers_save_v2": true`가 보이면 최신입니다. 그래도 실패하면 Supabase migrations(001→002)와 service_role 키를 확인하세요.'
    );
  }
  const raw = rawDetail(err);
  if (raw.length > 0) {
    return raw;
  }
  return '저장 요청이 끝나지 않았습니다. 네트워크와 API 실행 여부를 확인해 주세요.';
}
