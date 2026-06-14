from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.database import SessionLocal
from app.core.audit import log_audit
from app.core.security import decode_token


MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
AUDITED_PREFIXES = (
    "/facilities",
    "/specialists",
    "/procedures",
    "/liver-registry",
    "/patients",
    "/referrals",
    "/doctor",
    "/followups",
)


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        if request.method not in MUTATING_METHODS:
            return response

        path = request.url.path
        if not any(path.startswith(prefix) for prefix in AUDITED_PREFIXES):
            return response

        if response.status_code >= 400:
            return response

        user_id = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = decode_token(token)
                sub = payload.get("sub")
                if sub:
                    user_id = int(sub)
            except Exception:
                pass

        resource_type = path.strip("/").split("/")[0] if path.strip("/") else "unknown"
        db = SessionLocal()
        try:
            log_audit(
                db,
                user_id=user_id,
                action=request.method,
                resource_type=resource_type,
                resource_id=None,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                details={"path": path, "status_code": response.status_code},
            )
        except Exception:
            db.rollback()
        finally:
            db.close()

        return response
