from pydantic import BaseModel, Field


class PubMedSearchHit(BaseModel):
    pmid: str
    title: str
    abstract: str | None
    authors: list[str] = Field(default_factory=list)
    journal: str | None
    publishedDate: str | None
    keywords: list[str] = Field(default_factory=list)
    paperType: str
    importanceScore: int
    shortsFitScore: int
    longformFitScore: int


class PapersSearchResponse(BaseModel):
    query: str
    results: list[PubMedSearchHit]


class PaperResponse(BaseModel):
    id: str
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
    summary: str | None
    script: str | None
    createdAt: str


class PaperCreate(BaseModel):
    pmid: str = Field(min_length=1)
    title: str = Field(min_length=1)
    abstract: str | None = None
    authors: list[str] | None = None
    journal: str | None = None
    publishedDate: str | None = None
    keywords: list[str] | None = None
    paperType: str | None = None
    importanceScore: int | None = None
    shortsFitScore: int | None = None
    longformFitScore: int | None = None


class SummarizePaperResponse(BaseModel):
    paperId: str
    summary: str


class ScriptPaperResponse(BaseModel):
    paperId: str
    script: str
