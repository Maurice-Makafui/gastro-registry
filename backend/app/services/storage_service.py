"""Supabase Storage utility for endoscopy images and PDF reports."""
import mimetypes
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

_client: Optional[Client] = None


def _get_client() -> Client:
    global _client
    if _client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client


def upload_image(bucket: str, path: str, data: bytes, content_type: str = "image/jpeg") -> str:
    """Upload an endoscopy image. Returns the public URL."""
    client = _get_client()
    client.storage.from_(bucket).upload(path, data, {"content-type": content_type, "upsert": "true"})
    return client.storage.from_(bucket).get_public_url(path)


def upload_pdf(bucket: str, path: str, data: bytes) -> str:
    """Upload a PDF report. Returns the public URL."""
    client = _get_client()
    client.storage.from_(bucket).upload(
        path, data, {"content-type": "application/pdf", "upsert": "true"}
    )
    return client.storage.from_(bucket).get_public_url(path)


def delete_file(bucket: str, path: str) -> None:
    """Delete a file from Supabase Storage."""
    _get_client().storage.from_(bucket).remove([path])
