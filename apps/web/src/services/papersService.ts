import type {
  PaperCreatePayload,
  PaperRecord,
  PapersSearchOptions,
  PapersSearchResponse,
  ScriptPaperResponse,
  SummarizePaperResponse,
} from '@brainbite/shared-types';

import { fetchJson } from './apiClient';

export async function searchPubMed(
  query: string,
  options: PapersSearchOptions = {},
): Promise<PapersSearchResponse> {
  const q = encodeURIComponent(query);
  const limit = options.limit ?? 15;
  const recentDays = options.recentDays ?? 30;
  const metaFirst = options.metaAnalysisFirst ?? true;
  const domainPriority = options.domainPriority ?? true;
  const params = [
    `q=${q}`,
    `limit=${String(limit)}`,
    `recent_days=${String(recentDays)}`,
    `meta_analysis_first=${String(metaFirst)}`,
    `domain_priority=${String(domainPriority)}`,
  ].join('&');
  return fetchJson<PapersSearchResponse>(`/api/papers/search?${params}`);
}

export async function listSavedPapers(): Promise<PaperRecord[]> {
  return fetchJson<PaperRecord[]>('/api/papers');
}

export async function getSavedPaper(id: string): Promise<PaperRecord> {
  return fetchJson<PaperRecord>(`/api/papers/${encodeURIComponent(id)}`);
}

export async function savePaper(payload: PaperCreatePayload): Promise<PaperRecord> {
  return fetchJson<PaperRecord>('/api/papers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function summarizePaper(id: string): Promise<SummarizePaperResponse> {
  return fetchJson<SummarizePaperResponse>(`/api/papers/${encodeURIComponent(id)}/summarize`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function generateScript(id: string): Promise<ScriptPaperResponse> {
  return fetchJson<ScriptPaperResponse>(`/api/papers/${encodeURIComponent(id)}/script`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
