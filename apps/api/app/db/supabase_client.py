import logging

from supabase import Client, create_client

from app.config import settings

logger = logging.getLogger(__name__)


def supabase_env_filled() -> bool:
    url = (settings.supabase_url or "").strip()
    key = (settings.supabase_service_role_key or "").strip()
    return bool(url and key)


def get_supabase() -> Client | None:
    url = (settings.supabase_url or "").strip()
    key = (settings.supabase_service_role_key or "").strip()
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except Exception as exc:  # noqa: BLE001 — invalid key/url, network, etc.
        logger.warning("Supabase create_client failed: %s", exc)
        return None