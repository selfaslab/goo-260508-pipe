"""Application settings. Loads `.env` from disk before instantiating Settings (cwd-independent)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# `app/config.py` → parent `app/` → parent `apps/api/`
_API_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT_ENV = _API_DIR.parent / ".env"
_API_ENV = _API_DIR / ".env"


def _parse_openai_key_from_dotenv_file(path: Path) -> str | None:
    """Fallback if python-dotenv skipped a line (BOM, odd quoting). Does not log the value."""
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError:
        return None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line.removeprefix("export ").strip()
        for prefix in ("OPENAI_API_KEY=", "OPENAI_KEY="):
            if line.startswith(prefix):
                v = line[len(prefix) :].strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                    v = v[1:-1].strip()
                return v if v else None
    return None


def _bootstrap_openai_into_environ() -> None:
    """If OPENAI_API_KEY is still empty, read it explicitly from known .env paths."""
    if os.environ.get("OPENAI_API_KEY", "").strip():
        return
    for path in (_API_ENV, _REPO_ROOT_ENV):
        parsed = _parse_openai_key_from_dotenv_file(path)
        if parsed:
            os.environ["OPENAI_API_KEY"] = parsed
            return


# Repo root first, then apps/api (latter wins for duplicate keys in normal dotenv merge).
if _REPO_ROOT_ENV.is_file():
    load_dotenv(_REPO_ROOT_ENV, encoding="utf-8", override=False)
if _API_ENV.is_file():
    load_dotenv(_API_ENV, encoding="utf-8", override=True)

_bootstrap_openai_into_environ()


class Settings(BaseSettings):
    """Process env (including values from load_dotenv + bootstrap above)."""

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    openai_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("OPENAI_API_KEY", "OPENAI_KEY"),
    )
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    ncbi_email: str = "brainbite@localhost"
    ncbi_api_key: str = ""

    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()


def get_openai_api_key() -> str:
    """Prefer live `os.environ` (filled by dotenv at import); avoids rare Settings/env mismatch."""
    v = os.environ.get("OPENAI_API_KEY", "").strip() or os.environ.get("OPENAI_KEY", "").strip()
    if v:
        return v
    return settings.openai_api_key.strip()


def env_dotenv_files_present() -> dict[str, bool]:
    """For /api/health only — whether known .env paths exist (no contents leaked)."""
    return {
        "dotenv_apps_api_exists": _API_ENV.is_file(),
        "dotenv_repo_root_exists": _REPO_ROOT_ENV.is_file(),
    }
