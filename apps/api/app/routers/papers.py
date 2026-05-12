from datetime import date, datetime
from uuid import UUID

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.exceptions import APIError
from pydantic import ValidationError
from supabase import Client

from app.db.supabase_client import get_supabase
from app.models.schemas import (
    PaperCreate,
    PaperResponse,
    PapersSearchResponse,
    PubMedSearchHit,
    ScriptPaperResponse,
    SummarizePaperResponse,
)
from app.services import openai_service
from app.services.pubmed_service import PubMedSearchOptions, search_pubmed

router = APIRouter(prefix="/papers", tags=["papers"])
logger = logging.getLogger(__name__)


def _published_date_for_db(value: str | None) -> str | None:
    """`papers.published_date` is a Postgres date; only pass ISO yyyy-mm-dd or None."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    candidates: list[str] = []
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        candidates.append(s[:10])
    if "T" in s:
        candidates.append(s.split("T", 1)[0])
    for cand in candidates:
        if len(cand) >= 10:
            try:
                date.fromisoformat(cand[:10])
                return cand[:10]
            except ValueError:
                continue
    return None


def _format_postgrest_api_error(exc: APIError) -> str:
    parts: list[str] = []
    if exc.message:
        parts.append(exc.message)
    if exc.details:
        parts.append(f"details: {exc.details}")
    if exc.hint:
        parts.append(f"hint: {exc.hint}")
    if exc.code:
        parts.append(f"code: {exc.code}")
    return " | ".join(parts) if parts else str(exc)


def _exception_save_context(exc: BaseException) -> str:
    chunks: list[str] = []
    cur: BaseException | None = exc
    for _ in range(5):
        if cur is None:
            break
        if isinstance(cur, APIError):
            t = _format_postgrest_api_error(cur)
            if t and t not in " || ".join(chunks):
                chunks.append(t)
        else:
            s = str(cur).strip()
            if s and s not in " || ".join(chunks):
                chunks.append(s)
        cur = cur.__cause__ or cur.__context__
    return " || ".join(chunks) if chunks else repr(exc)


def _save_db_error_detail(exc: BaseException) -> str:
    msg = _exception_save_context(exc)
    low = msg.lower()
    hints: list[str] = []
    if "42703" in msg or ("column" in low and "does not exist" in low):
        hints.append(
            "Supabase에서 `supabase/migrations/001_papers.sql` 다음 `002_papers_search_scoring.sql`을 순서대로 실행했는지 확인하세요."
        )
    if "pgrst205" in low or "could not find the table" in low or "schema cache" in low:
        hints.append(
            "Supabase 대시보드 → SQL Editor에서 저장소의 `supabase/migrations/001_papers.sql`을 통째로 실행한 뒤, "
            "이어서 `002_papers_search_scoring.sql`을 실행하세요. (다른 Supabase 프로젝트 URL을 쓰고 있지 않은지도 확인하세요.)"
        )
    if "invalid input syntax for type date" in low or "date/time field value out of range" in low:
        hints.append("출판일은 YYYY-MM-DD 형식만 저장됩니다(그 외는 null).")
    if "permission denied" in low or "42501" in msg:
        hints.append("service_role 키를 사용 중인지, RLS로 막히지 않았는지 확인하세요.")
    if hints:
        msg = f"{msg}  ||  {' '.join(hints)}" if msg else "  ||  ".join(hints)
    if len(msg) > 2200:
        return msg[:2200] + "…"
    return msg or "알 수 없는 DB 오류."


def _as_opt_str(val: object) -> str | None:
    if val is None:
        return None
    if isinstance(val, str):
        return val if val.strip() else None
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    s = str(val).strip()
    return s if s else None


def _as_authors(val: object) -> list[str]:
    if isinstance(val, list):
        out: list[str] = []
        for item in val:
            if isinstance(item, str):
                out.append(item)
        return out
    return []


def _as_keywords(val: object) -> list[str]:
    if isinstance(val, list):
        out: list[str] = []
        for item in val:
            if isinstance(item, str) and item.strip():
                out.append(item.strip())
        return out
    return []


def _as_int(val: object, default: int = 0) -> int:
    if isinstance(val, bool):
        return default
    if isinstance(val, int):
        return val
    if isinstance(val, float) and val.is_integer():
        return int(val)
    if isinstance(val, str) and val.strip().isdigit():
        return int(val.strip())
    return default


def _require_supabase() -> Client:
    client = get_supabase()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Supabase에 연결할 수 없습니다. apps/api/.env에 SUPABASE_URL과 "
                "SUPABASE_SERVICE_ROLE_KEY(대시보드 Settings → API의 service_role JWT, anon 아님)를 "
                "넣은 뒤 API(uvicorn)를 재시작하세요."
            ),
        )
    return client


def _row_to_paper(row: object) -> PaperResponse:
    if not isinstance(row, dict):
        raise HTTPException(status_code=500, detail="Invalid database row shape.")

    rid = row.get("id")
    pmid = row.get("pmid")
    title = row.get("title")
    if rid is None or pmid is None or title is None:
        raise HTTPException(status_code=500, detail="Incomplete paper row.")

    authors = _as_authors(row.get("authors"))
    keywords = _as_keywords(row.get("keywords"))
    paper_type = _as_opt_str(row.get("paper_type")) or "unknown"

    created_raw = row.get("created_at")
    if created_raw is None:
        raise HTTPException(status_code=500, detail="Missing created_at.")
    created_at_str = _as_opt_str(created_raw) or str(created_raw)

    try:
        return PaperResponse(
            id=str(rid),
            pmid=str(pmid),
            title=str(title),
            abstract=_as_opt_str(row.get("abstract")),
            authors=authors,
            journal=_as_opt_str(row.get("journal")),
            publishedDate=_as_opt_str(row.get("published_date")) or _as_opt_str(row.get("pub_date")),
            keywords=keywords,
            paperType=paper_type,
            importanceScore=_as_int(row.get("importance_score"), 0),
            shortsFitScore=_as_int(row.get("shorts_fit_score"), 0),
            longformFitScore=_as_int(row.get("longform_fit_score"), 0),
            summary=_as_opt_str(row.get("summary")),
            script=_as_opt_str(row.get("script")),
            createdAt=created_at_str,
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"DB 행을 API 형식으로 바꾸지 못했습니다: {exc.errors()}",
        ) from exc


@router.get("/search", response_model=PapersSearchResponse)
async def search_papers(
    q: str = Query("", min_length=0),
    limit: int = Query(15, ge=1, le=50),
    recent_days: int = Query(30, ge=1, le=365),
    meta_analysis_first: bool = Query(True),
    domain_priority: bool = Query(True),
) -> PapersSearchResponse:
    try:
        results_raw = await search_pubmed(
            q,
            options=PubMedSearchOptions(
                retmax=limit,
                recent_days=recent_days,
                meta_analysis_first=meta_analysis_first,
                domain_priority=domain_priority,
            ),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    results = [
        PubMedSearchHit(
            pmid=r["pmid"],
            title=r["title"],
            abstract=r["abstract"],
            authors=r["authors"],
            journal=r["journal"],
            publishedDate=r["publishedDate"],
            keywords=r["keywords"],
            paperType=r["paperType"],
            importanceScore=r["importanceScore"],
            shortsFitScore=r["shortsFitScore"],
            longformFitScore=r["longformFitScore"],
        )
        for r in results_raw
    ]
    return PapersSearchResponse(query=q, results=results)


@router.get("", response_model=list[PaperResponse])
@router.get("/", response_model=list[PaperResponse])
def list_saved_papers(
    limit: int = Query(100, ge=1, le=200),
) -> list[PaperResponse]:
    sb = get_supabase()
    if sb is None:
        return []
    try:
        resp = sb.table("papers").select("*").order("created_at", desc=True).limit(limit).execute()
    except APIError as exc:
        raise HTTPException(
            status_code=502,
            detail="저장 목록을 불러오지 못했습니다: " + _format_postgrest_api_error(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="저장 목록을 불러오지 못했습니다: " + _exception_save_context(exc),
        ) from exc
    rows = resp.data if isinstance(resp.data, list) else []
    out: list[PaperResponse] = []
    for row in rows:
        try:
            out.append(_row_to_paper(row))
        except HTTPException as exc:
            logger.warning("Skipping malformed papers row: %s", exc.detail)
            continue
    return out


@router.get("/{paper_id}", response_model=PaperResponse)
def get_paper(
    paper_id: UUID,
    sb: Client = Depends(_require_supabase),
) -> PaperResponse:
    resp = sb.table("papers").select("*").eq("id", str(paper_id)).limit(1).execute()
    rows = resp.data if isinstance(resp.data, list) else []
    if not rows:
        raise HTTPException(status_code=404, detail="Paper not found.")
    return _row_to_paper(rows[0])


@router.post("", response_model=PaperResponse, status_code=201)
@router.post("/", response_model=PaperResponse, status_code=201)
def save_paper(
    body: PaperCreate,
    sb: Client = Depends(_require_supabase),
) -> PaperResponse:
    insert_row = {
        "pmid": body.pmid,
        "title": body.title,
        "abstract": body.abstract,
        "authors": body.authors or [],
        "journal": body.journal,
        "published_date": _published_date_for_db(body.publishedDate),
        "keywords": body.keywords or [],
        "paper_type": body.paperType or "unknown",
        "importance_score": body.importanceScore or 0,
        "shorts_fit_score": body.shortsFitScore or 0,
        "longform_fit_score": body.longformFitScore or 0,
        "summary": None,
        "script": None,
    }

    try:
        # postgrest-py: insert() returns SyncQueryRequestBuilder (no .select()).
        # Default `returning=representation` returns inserted row(s) in response.data.
        resp = sb.table("papers").insert(insert_row).execute()
    except Exception as exc:  # noqa: BLE001 — surface supabase/pg errors plainly
        ctx = _exception_save_context(exc).lower()
        is_dup = (
            "duplicate key" in ctx
            or "23505" in ctx
            or (isinstance(exc, APIError) and getattr(exc, "code", None) == "23505")
        )
        if is_dup:
            existing = sb.table("papers").select("*").eq("pmid", body.pmid).limit(1).execute()
            rows = existing.data if isinstance(existing.data, list) else []
            if rows:
                raise HTTPException(
                    status_code=409,
                    detail="Paper with this PMID already exists.",
                ) from exc
        raise HTTPException(
            status_code=502,
            detail="논문을 저장하지 못했습니다. " + _save_db_error_detail(exc),
        ) from exc

    rows_inserted = resp.data if isinstance(resp.data, list) else []
    if not rows_inserted:
        fetched = sb.table("papers").select("*").eq("pmid", body.pmid).limit(1).execute()
        fetched_rows = fetched.data if isinstance(fetched.data, list) else []
        if not fetched_rows:
            raise HTTPException(
                status_code=502,
                detail=(
                    "저장 후 DB에서 행을 읽지 못했습니다. Supabase에 "
                    "`supabase/migrations/001_papers.sql`과 `002_papers_search_scoring.sql`을 "
                    "순서대로 적용했는지 확인하고 API(uvicorn)를 재시작하세요."
                ),
            )
        return _row_to_paper(fetched_rows[0])

    return _row_to_paper(rows_inserted[0])


@router.post("/{paper_id}/summarize", response_model=SummarizePaperResponse)
async def summarize_saved_paper(
    paper_id: UUID,
    sb: Client = Depends(_require_supabase),
) -> SummarizePaperResponse:
    resp = sb.table("papers").select("*").eq("id", str(paper_id)).limit(1).execute()
    rows = resp.data if isinstance(resp.data, list) else []
    if not rows:
        raise HTTPException(status_code=404, detail="Paper not found.")

    row = rows[0]
    if not isinstance(row, dict):
        raise HTTPException(status_code=500, detail="Invalid database row.")

    title = row.get("title")
    abstract = _as_opt_str(row.get("abstract"))
    if not isinstance(title, str):
        raise HTTPException(status_code=500, detail="Invalid paper title.")

    try:
        summary_text = await openai_service.summarize_paper_text(title, abstract)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="OpenAI request failed.") from exc

    upd = sb.table("papers").update({"summary": summary_text}).eq("id", str(paper_id)).execute()
    upd_rows = upd.data if isinstance(upd.data, list) else []
    if not upd_rows:
        verify = sb.table("papers").select("summary").eq("id", str(paper_id)).limit(1).execute()
        verify_rows = verify.data if isinstance(verify.data, list) else []
        if not verify_rows:
            raise HTTPException(status_code=502, detail="Failed to persist summary.")

    return SummarizePaperResponse(paperId=str(paper_id), summary=summary_text)


@router.post("/{paper_id}/script", response_model=ScriptPaperResponse)
async def script_for_saved_paper(
    paper_id: UUID,
    sb: Client = Depends(_require_supabase),
) -> ScriptPaperResponse:
    resp = sb.table("papers").select("*").eq("id", str(paper_id)).limit(1).execute()
    rows = resp.data if isinstance(resp.data, list) else []
    if not rows:
        raise HTTPException(status_code=404, detail="Paper not found.")

    row = rows[0]
    if not isinstance(row, dict):
        raise HTTPException(status_code=500, detail="Invalid database row.")

    title = row.get("title")
    summary = _as_opt_str(row.get("summary"))
    if not isinstance(title, str):
        raise HTTPException(status_code=500, detail="Invalid paper title.")
    if not summary or not summary.strip():
        raise HTTPException(
            status_code=400,
            detail="Summary is required. Run summarize first.",
        )

    try:
        script_text = await openai_service.shorts_script_from_summary(title, summary)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail="OpenAI request failed.") from exc

    sb.table("papers").update({"script": script_text}).eq("id", str(paper_id)).execute()

    return ScriptPaperResponse(paperId=str(paper_id), script=script_text)
