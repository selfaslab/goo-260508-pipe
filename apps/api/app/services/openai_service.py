from openai import AsyncOpenAI

from app.config import get_openai_api_key

SUMMARY_SYSTEM = (
    "You are BrainBite, an AI health psychology and neuroscience lab companion. "
    "Summarize papers in clear Korean for curious adults. "
    "Use short sections: 핵심 질문, 방법(간단히), 주요 결과, 시사점(건강·뇌 관점). "
    "Stay faithful to the abstract; if details are missing, say so. "
    "No hype, no medical advice — educational tone only."
)

SCRIPT_SYSTEM = (
    "You are BrainBite, a cute cactus scientist with glasses, hosting a YouTube Short. "
    "Write a punchy Korean spoken script (about 45–60 seconds when read aloud). "
    "Structure: HOOK (1 line), 3 micro-beats with one idea each, CLOSER with one actionable "
    "reflection question. Simple words, engaging, accurate to the summary. "
    "No diagnosis or treatment instructions."
)


def _client() -> AsyncOpenAI:
    key = get_openai_api_key()
    if not key:
        raise RuntimeError(
            "OpenAI API 키가 없습니다. apps/api/.env에 OPENAI_API_KEY=sk-... 를 넣고 "
            "FastAPI(uvicorn)를 재시작한 뒤 다시 시도하세요."
        )
    return AsyncOpenAI(api_key=key)


async def summarize_paper_text(title: str, abstract: str | None) -> str:
    body = abstract.strip() if abstract else ""
    user = f"제목: {title}\n\n초록:\n{body if body else '(초록 없음 — 제목만으로 조심스럽게 맥락을 설명하고 한계를 명시하세요.)'}"

    cli = _client()
    resp = await cli.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.4,
        messages=[
            {"role": "system", "content": SUMMARY_SYSTEM},
            {"role": "user", "content": user},
        ],
    )
    content = resp.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI returned empty summary.")
    return content.strip()


async def shorts_script_from_summary(title: str, summary: str) -> str:
    user = f"논문 제목: {title}\n\n연구 요약:\n{summary}"

    cli = _client()
    resp = await cli.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.65,
        messages=[
            {"role": "system", "content": SCRIPT_SYSTEM},
            {"role": "user", "content": user},
        ],
    )
    content = resp.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI returned empty script.")
    return content.strip()
