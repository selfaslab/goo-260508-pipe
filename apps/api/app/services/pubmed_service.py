from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import xml.etree.ElementTree as ET
from typing import TypedDict
from urllib.parse import urlencode

import httpx

from app.config import settings

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"


class PubMedArticleDict(TypedDict):
    pmid: str
    title: str
    abstract: str | None
    authors: list[str]
    journal: str | None
    publishedDate: str | None
    keywords: list[str]
    paperType: str
    importanceScore: int
    shortsFitScore: int
    longformFitScore: int


@dataclass(frozen=True)
class PubMedSearchOptions:
    retmax: int = 15
    recent_days: int = 30
    meta_analysis_first: bool = True
    domain_priority: bool = True


_NS = {"m": "http://www.ncbi.nlm.nih.gov"}
_DOMAIN_TERMS = ("psychology", "brain", "mental", "cognition", "neuro", "mood", "stress")


def _text(el: ET.Element | None) -> str | None:
    if el is None:
        return None
    text = "".join(el.itertext()).strip()
    return text if text else None


def _local_tag(el: ET.Element) -> str:
    if "}" in el.tag:
        return el.tag.split("}", 1)[1]
    return el.tag


def _normalize_token(text: str) -> str:
    return "".join(ch.lower() for ch in text if ch.isalnum() or ch == " ")


def _to_date_string(year: str | None, month: str | None, day: str | None) -> str | None:
    if not year:
        return None
    month_map = {
        "jan": 1,
        "feb": 2,
        "mar": 3,
        "apr": 4,
        "may": 5,
        "jun": 6,
        "jul": 7,
        "aug": 8,
        "sep": 9,
        "oct": 10,
        "nov": 11,
        "dec": 12,
    }
    m_int = 1
    d_int = 1
    if month:
        if month.isdigit():
            m_int = max(1, min(12, int(month)))
        else:
            m_int = month_map.get(month.strip()[:3].lower(), 1)
    if day and day.isdigit():
        d_int = max(1, min(31, int(day)))
    try:
        return datetime(int(year), m_int, d_int, tzinfo=UTC).date().isoformat()
    except ValueError:
        return None


def _extract_keywords(citation: ET.Element) -> list[str]:
    keywords: list[str] = []
    keyword_lists = citation.findall(".//Keyword", _NS)
    if not keyword_lists:
        keyword_lists = citation.findall(".//{http://www.ncbi.nlm.nih.gov}Keyword")
    for k in keyword_lists:
        txt = _text(k)
        if txt:
            keywords.append(txt)
    dedup: list[str] = []
    seen: set[str] = set()
    for item in keywords:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        dedup.append(item)
    return dedup[:20]


def _extract_paper_type(citation: ET.Element) -> str:
    pub_types = citation.findall(".//PublicationType", _NS)
    if not pub_types:
        pub_types = citation.findall(".//{http://www.ncbi.nlm.nih.gov}PublicationType")
    ranked = [(_text(t) or "") for t in pub_types]
    ranked = [x for x in ranked if x]
    if not ranked:
        return "unknown"
    preferred = ("Meta-Analysis", "Systematic Review", "Review", "Randomized Controlled Trial")
    for want in preferred:
        for item in ranked:
            if want.lower() in item.lower():
                return item
    return ranked[0]


def _contains_domain_terms(title: str, abstract: str | None, keywords: list[str]) -> bool:
    merged = " ".join([title, abstract or "", " ".join(keywords)]).lower()
    return any(term in merged for term in _DOMAIN_TERMS)


def _score_importance(title: str, abstract: str | None, paper_type: str, keywords: list[str]) -> int:
    score = 40
    body = f"{title} {abstract or ''}".lower()
    if "meta-analysis" in paper_type.lower():
        score += 30
    elif "systematic review" in paper_type.lower():
        score += 24
    elif "review" in paper_type.lower():
        score += 16
    if "randomized" in body or "trial" in body:
        score += 12
    if "sample" in body or "participants" in body:
        score += 6
    if _contains_domain_terms(title, abstract, keywords):
        score += 12
    return max(0, min(100, score))


def _score_shorts_fit(title: str, abstract: str | None, keywords: list[str], paper_type: str) -> int:
    score = 35
    merged = f"{title} {abstract or ''} {' '.join(keywords)}".lower()
    if any(x in merged for x in ("sleep", "stress", "anxiety", "depression", "focus", "habit")):
        score += 22
    if "meta-analysis" in paper_type.lower() or "review" in paper_type.lower():
        score += 14
    if any(x in merged for x in ("brain", "mental", "psychology", "mindfulness")):
        score += 16
    return max(0, min(100, score))


def _score_longform_fit(abstract: str | None, paper_type: str, authors: list[str]) -> int:
    score = 30
    abs_len = len(abstract) if abstract else 0
    if abs_len > 1400:
        score += 26
    elif abs_len > 800:
        score += 18
    elif abs_len > 350:
        score += 10
    if any(x in paper_type.lower() for x in ("meta-analysis", "systematic", "review")):
        score += 20
    if len(authors) >= 5:
        score += 8
    return max(0, min(100, score))


def _parse_article_xml(root: ET.Element) -> PubMedArticleDict | None:
    if _local_tag(root) == "PubmedArticle":
        article_el = root
    else:
        article_el = root.find(".//PubmedArticle", _NS)
        if article_el is None:
            article_el = root.find(".//{http://www.ncbi.nlm.nih.gov}PubmedArticle")
    if article_el is None:
        return None

    citation = article_el.find(".//MedlineCitation", _NS)
    if citation is None:
        citation = article_el.find(".//{http://www.ncbi.nlm.nih.gov}MedlineCitation")
    if citation is None:
        return None

    pmid_el = citation.find("./PMID", _NS)
    if pmid_el is None:
        pmid_el = citation.find("./{http://www.ncbi.nlm.nih.gov}PMID")
    pmid = pmid_el.text.strip() if pmid_el is not None and pmid_el.text else None
    if not pmid:
        return None

    article = citation.find("./Article", _NS)
    if article is None:
        article = citation.find("./{http://www.ncbi.nlm.nih.gov}Article")

    title_el = None
    journal_title = None
    published_date = None
    if article is not None:
        title_el = article.find("./ArticleTitle", _NS)
        if title_el is None:
            title_el = article.find("./{http://www.ncbi.nlm.nih.gov}ArticleTitle")

        journal = citation.find("./MedlineJournalInfo/MedlineAbbrev", _NS)
        if journal is None:
            journal = citation.find(
                "./{http://www.ncbi.nlm.nih.gov}MedlineJournalInfo/{http://www.ncbi.nlm.nih.gov}MedlineAbbrev",
            )
        journal_title = _text(journal)

        article_date = article.find("./ArticleDate", _NS)
        if article_date is None:
            article_date = article.find("./{http://www.ncbi.nlm.nih.gov}ArticleDate")
        if article_date is None:
            journal_issue = article.find("./Journal/JournalIssue/PubDate", _NS)
            if journal_issue is None:
                journal_issue = article.find(
                    "./{http://www.ncbi.nlm.nih.gov}Journal/"
                    "{http://www.ncbi.nlm.nih.gov}JournalIssue/"
                    "{http://www.ncbi.nlm.nih.gov}PubDate",
                )
            article_date = journal_issue
        if article_date is not None:
            y = article_date.find("./Year", _NS)
            if y is None:
                y = article_date.find("./{http://www.ncbi.nlm.nih.gov}Year")
            m = article_date.find("./Month", _NS)
            if m is None:
                m = article_date.find("./{http://www.ncbi.nlm.nih.gov}Month")
            parts: list[str] = []
            if y is not None and y.text:
                parts.append(y.text)
            if m is not None and m.text:
                parts.append(m.text)
            if parts:
                published_date = _to_date_string(y.text if y is not None else None, m.text if m is not None else None, None)

        abstract_el = article.find("./Abstract", _NS)
        if abstract_el is None:
            abstract_el = article.find("./{http://www.ncbi.nlm.nih.gov}Abstract")
        abstract_chunks: list[str] = []
        if abstract_el is not None:
            for at in abstract_el.findall("./AbstractText", _NS):
                if at is None:
                    continue
                label = at.get("Label")
                chunk = _text(at)
                if not chunk:
                    continue
                if label:
                    abstract_chunks.append(f"{label}: {chunk}")
                else:
                    abstract_chunks.append(chunk)
            if not abstract_el.findall("./AbstractText", _NS):
                for at in abstract_el.findall(
                    "./{http://www.ncbi.nlm.nih.gov}AbstractText",
                ):
                    label = at.get("Label")
                    chunk = _text(at)
                    if not chunk:
                        continue
                    if label:
                        abstract_chunks.append(f"{label}: {chunk}")
                    else:
                        abstract_chunks.append(chunk)
        abstract_text = "\n\n".join(abstract_chunks) if abstract_chunks else None

        authors: list[str] = []
        author_list = article.find("./AuthorList", _NS)
        if author_list is None:
            author_list = article.find("./{http://www.ncbi.nlm.nih.gov}AuthorList")
        if author_list is not None:
            candidates = author_list.findall("./Author", _NS)
            if not candidates:
                candidates = author_list.findall(
                    "./{http://www.ncbi.nlm.nih.gov}Author",
                )
            for au in candidates:
                last = au.find("./LastName", _NS) or au.find(
                    "./{http://www.ncbi.nlm.nih.gov}LastName",
                )
                fore = au.find("./ForeName", _NS) or au.find(
                    "./{http://www.ncbi.nlm.nih.gov}ForeName",
                )
                initials = au.find("./Initials", _NS) or au.find(
                    "./{http://www.ncbi.nlm.nih.gov}Initials",
                )
                collective = au.find("./CollectiveName", _NS) or au.find(
                    "./{http://www.ncbi.nlm.nih.gov}CollectiveName",
                )
                if collective is not None and collective.text:
                    authors.append(collective.text.strip())
                    continue
                name_parts: list[str] = []
                if fore is not None and fore.text:
                    name_parts.append(fore.text.strip())
                if initials is not None and initials.text and not (
                    fore is not None and fore.text
                ):
                    name_parts.append(initials.text.strip())
                if last is not None and last.text:
                    name_parts.append(last.text.strip())
                if name_parts:
                    authors.append(" ".join(name_parts))

        title_text = _text(title_el)
        keywords = _extract_keywords(citation)
        paper_type = _extract_paper_type(citation)
        safe_title = title_text or "Untitled"
        importance = _score_importance(safe_title, abstract_text, paper_type, keywords)
        shorts_fit = _score_shorts_fit(safe_title, abstract_text, keywords, paper_type)
        longform_fit = _score_longform_fit(abstract_text, paper_type, authors)

        return {
            "pmid": pmid,
            "title": safe_title,
            "abstract": abstract_text,
            "authors": authors,
            "journal": journal_title,
            "publishedDate": published_date,
            "keywords": keywords,
            "paperType": paper_type,
            "importanceScore": importance,
            "shortsFitScore": shorts_fit,
            "longformFitScore": longform_fit,
        }

    return {
        "pmid": pmid,
        "title": "Untitled",
        "abstract": None,
        "authors": [],
        "journal": journal_title,
        "publishedDate": None,
        "keywords": [],
        "paperType": "unknown",
        "importanceScore": 20,
        "shortsFitScore": 20,
        "longformFitScore": 20,
    }


def _is_recent_enough(published_date: str | None, recent_days: int) -> bool:
    if not published_date:
        return False
    try:
        pub = datetime.fromisoformat(published_date).date()
    except ValueError:
        return False
    delta = datetime.now(tz=UTC).date() - pub
    return 0 <= delta.days <= recent_days


def _rank_key(item: PubMedArticleDict, opts: PubMedSearchOptions) -> tuple[int, int, int]:
    meta_priority = 1 if ("meta-analysis" in item["paperType"].lower()) else 0
    domain_priority = 1 if _contains_domain_terms(item["title"], item["abstract"], item["keywords"]) else 0
    return (
        meta_priority if opts.meta_analysis_first else 0,
        domain_priority if opts.domain_priority else 0,
        item["importanceScore"],
    )


def _esearch_params(
    *,
    term: str,
    retmax: int,
    recent_days: int,
    date_filter: bool,
) -> dict[str, str | int]:
    params: dict[str, str | int] = {
        "db": "pubmed",
        "term": term,
        "retmax": max(1, min(retmax, 200)),
        "retmode": "json",
        "sort": "pub date",
        "tool": "BrainBiteMVP",
        "email": settings.ncbi_email or "brainbite@example.com",
    }
    if date_filter:
        params["reldate"] = max(1, min(recent_days, 365))
        params["datetype"] = "pdat"
    return params


async def search_pubmed(term: str, options: PubMedSearchOptions | None = None) -> list[PubMedArticleDict]:
    opts = options or PubMedSearchOptions()
    q = term.strip()
    if not q:
        return []

    retmax = max(1, min(opts.retmax, 50))

    async with httpx.AsyncClient(timeout=45.0) as client:
        params = _esearch_params(term=q, retmax=retmax, recent_days=opts.recent_days, date_filter=True)
        if settings.ncbi_api_key.strip():
            params["api_key"] = settings.ncbi_api_key.strip()

        r = await client.get(f"{ESEARCH_URL}?{urlencode(params)}")
        r.raise_for_status()
        data = r.json()
        esearch = data.get("esearchresult", {})
        err = esearch.get("ERROR") or data.get("ERROR")
        if isinstance(err, str) and err.strip():
            raise RuntimeError(f"PubMed esearch error: {err.strip()}")

        id_list_raw = esearch.get("idlist", [])
        id_list = [str(x) for x in id_list_raw if x]

        # Some queries return no IDs with reldate; retry without date filter on PubMed side and filter locally.
        post_filter_days = opts.recent_days
        if not id_list:
            wide_ret = min(200, max(retmax * 4, 40))
            params2 = _esearch_params(term=q, retmax=wide_ret, recent_days=opts.recent_days, date_filter=False)
            if settings.ncbi_api_key.strip():
                params2["api_key"] = settings.ncbi_api_key.strip()
            r2 = await client.get(f"{ESEARCH_URL}?{urlencode(params2)}")
            r2.raise_for_status()
            data2 = r2.json()
            es2 = data2.get("esearchresult", {})
            err2 = es2.get("ERROR") or data2.get("ERROR")
            if isinstance(err2, str) and err2.strip():
                raise RuntimeError(f"PubMed esearch error: {err2.strip()}")
            id_list = [str(x) for x in es2.get("idlist", []) if x]
            post_filter_days = min(365, max(opts.recent_days, 180))

        if not id_list:
            return []

        fetch_params: dict[str, str | int | bool] = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "xml",
            "tool": "BrainBiteMVP",
            "email": settings.ncbi_email or "brainbite@example.com",
        }
        if settings.ncbi_api_key.strip():
            fetch_params["api_key"] = settings.ncbi_api_key.strip()

        fr = await client.get(f"{EFETCH_URL}?{urlencode(fetch_params, doseq=False)}")
        fr.raise_for_status()
        xml_text = fr.text

    xml_text_stripped = xml_text.lstrip("\ufeff")
    try:
        root = ET.fromstring(xml_text_stripped)
    except ET.ParseError:
        return []

    out: list[PubMedArticleDict] = []

    pubs = root.findall(".//PubmedArticle", _NS)
    if not pubs:
        pubs = root.findall(".//{http://www.ncbi.nlm.nih.gov}PubmedArticle")

    if pubs:
        for pub in pubs:
            parsed = _parse_article_xml(pub)
            if parsed is None:
                continue
            # Keep rows when PubDate XML is missing; otherwise respect post_filter_days (wider after fallback esearch).
            pd = parsed["publishedDate"]
            if pd is None or _is_recent_enough(pd, post_filter_days):
                out.append(parsed)
    else:
        parsed = _parse_article_xml(root)
        if parsed is not None:
            pd = parsed["publishedDate"]
            if pd is None or _is_recent_enough(pd, post_filter_days):
                out.append(parsed)

    order = {pmid: idx for idx, pmid in enumerate(id_list)}
    out.sort(
        key=lambda item: (
            -_rank_key(item, opts)[0],
            -_rank_key(item, opts)[1],
            -_rank_key(item, opts)[2],
            order.get(item["pmid"], 9999),
        ),
    )
    return out
