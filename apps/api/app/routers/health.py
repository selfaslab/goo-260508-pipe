from fastapi import APIRouter

from app.config import env_dotenv_files_present, get_openai_api_key
from app.db.supabase_client import get_supabase, supabase_env_filled

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str | bool | None]:
    client = get_supabase()
    filled = supabase_env_filled()
    issue: str | None = None
    if client is None:
        issue = "invalid_credentials" if filled else "missing_env"
    return {
        "status": "ok",
        "service": "brainbite-api",
        "supabase_configured": client is not None,
        "supabase_env_filled": filled,
        "supabase_issue": issue,
        # Web uses this to detect an outdated API still returning "Failed to save paper."
        "papers_save_v2": True,
        "openai_configured": bool(get_openai_api_key()),
        **env_dotenv_files_present(),
    }