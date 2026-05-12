function readDetail(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null || !('detail' in payload)) {
    return undefined;
  }
  const d = (payload as { detail: unknown }).detail;
  if (typeof d === 'string' && d.trim().length > 0) {
    return d;
  }
  if (Array.isArray(d)) {
    const parts = d
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'msg' in item) {
          return String((item as { msg?: unknown }).msg);
        }
        return typeof item === 'string' ? item : JSON.stringify(item);
      })
      .filter((s) => s.trim().length > 0);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }
  if (typeof d === 'object' && d !== null) {
    return JSON.stringify(d);
  }
  return undefined;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Origin only. Paths already include `/api/...`; trailing `/api` is stripped if pasted by mistake. */
export function getApiBaseUrl(): string {
  const fallback = 'http://localhost:8000';
  const initial = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';

  if (!initial || !/^https?:\/\//i.test(initial)) {
    if (import.meta.env.DEV) {
      if (initial) {
        console.warn(
          '[BrainBite] VITE_API_BASE_URL must start with http:// or https:// (secrets belong in apps/api/.env). Using same-origin /api via Vite proxy → http://127.0.0.1:8000.',
        );
      }
      return '';
    }
    if (initial) {
      console.warn(
        '[BrainBite] VITE_API_BASE_URL must start with http:// or https://. Using default:',
        fallback,
      );
    }
    return fallback;
  }

  let raw = initial.replace(/\/+$/, '');
  if (raw.endsWith('/api')) {
    raw = raw.slice(0, -4).replace(/\/+$/, '');
  }

  if (import.meta.env.DEV) {
    try {
      const u = new URL(raw);
      const h = u.hostname.toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1') {
        console.warn(
          '[BrainBite] DEV: VITE_API_BASE_URL이 루프백( localhost / 127.0.0.1 )이라 브라우저 출처와 섞이면 CORS·Failed to fetch가 납니다. ' +
            '같은 출처 `/api` → Vite 프록시(127.0.0.1:8000)로 보냅니다.',
        );
        return '';
      }
    } catch {
      /* ignore invalid URL */
    }
  }

  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    try {
      if (new URL(raw).origin === window.location.origin) {
        console.warn(
          '[BrainBite] VITE_API_BASE_URL points at this dev server (same origin). Using Vite /api proxy → http://127.0.0.1:8000 instead.',
        );
        return '';
      }
    } catch {
      /* ignore invalid URL */
    }
  }

  return raw;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${normalizedPath}`;
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch (err) {
    const isNetwork =
      err instanceof TypeError ||
      (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message));
    const devHint =
      '로컬: `npm run dev:web`(Vite)와 `uvicorn app.main:app --host 127.0.0.1 --port 8000`(API)가 둘 다 떠 있는지 확인하세요. ' +
      '개발 중에는 루프백 API는 자동으로 Vite `/api` 프록시를 탑니다.';
    const prodHint = '`VITE_API_BASE_URL`과 배포 API 주소·CORS 설정을 확인하세요.';
    const msg = isNetwork
      ? `서버에 연결하지 못했습니다. (${err instanceof Error ? err.message : 'fetch'})\n\n${import.meta.env.DEV ? devHint : prodHint}`
      : err instanceof Error
        ? err.message
        : '요청 중 오류가 났습니다.';
    throw new ApiError(msg, 0);
  }

  if (!res.ok) {
    const text = await res.text();
    let detail = `${res.status} ${res.statusText}`;
    try {
      const parsed: unknown = JSON.parse(text);
      const d = readDetail(parsed);
      if (d && d.trim().length > 0) {
        detail = d;
      }
    } catch {
      if (text.trim().length > 0 && text.trim().length < 4000) detail = text;
    }
    throw new ApiError(detail.trim().length ? detail : 'Request failed.', res.status);
  }

  const body: unknown = await res.json();
  return body as T;
}
