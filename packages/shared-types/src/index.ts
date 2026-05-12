export interface PubMedSearchHit {
  pmid: string;
  title: string;
  abstract: string | null;
  authors: string[];
  journal: string | null;
  publishedDate: string | null;
  keywords: string[];
  paperType: string;
  importanceScore: number;
  shortsFitScore: number;
  longformFitScore: number;
}

export interface PaperRecord {
  id: string;
  pmid: string;
  title: string;
  abstract: string | null;
  authors: string[];
  journal: string | null;
  publishedDate: string | null;
  keywords: string[];
  paperType: string;
  importanceScore: number;
  shortsFitScore: number;
  longformFitScore: number;
  summary: string | null;
  script: string | null;
  createdAt: string;
}

export interface PapersSearchResponse {
  query: string;
  results: PubMedSearchHit[];
}

export interface PaperCreatePayload {
  pmid: string;
  title: string;
  abstract?: string | null;
  authors?: string[];
  journal?: string | null;
  publishedDate?: string | null;
  keywords?: string[];
  paperType?: string;
  importanceScore?: number;
  shortsFitScore?: number;
  longformFitScore?: number;
}

export interface PapersSearchOptions {
  limit?: number;
  recentDays?: number;
  metaAnalysisFirst?: boolean;
  domainPriority?: boolean;
}

export interface SummarizePaperResponse {
  paperId: string;
  summary: string;
}

export interface ScriptPaperResponse {
  paperId: string;
  script: string;
}

export interface ApiErrorBody {
  detail: string;
}
